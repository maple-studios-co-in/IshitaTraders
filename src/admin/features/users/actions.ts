"use server";

import { and, count, eq, ne, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";

import { can, canAssignRole } from "@/admin/config/permissions";
import { roleLabels, roles, type Role } from "@/admin/content/types";
import type { ActionState } from "@/admin/lib/action-state";
import { FormError, formValue, parseOrThrow, runAction } from "@/admin/server/action";
import { diff, logActivity } from "@/admin/server/audit";
import { AuthError, assertPermission } from "@/admin/server/auth/guard";
import { hashPassword, passwordProblem } from "@/admin/server/auth/password";
import type { SessionUser } from "@/admin/server/auth/session";
import { generateTemporaryPassword } from "@/admin/server/auth/temporary-password";
import { getDb, type Database } from "@/admin/server/db/client";
import { sessions, users } from "@/admin/server/db/schema";
import { resetRateLimit } from "@/admin/server/security/rate-limit";

import { LAST_OWNER_MESSAGE, removesActiveOwner, userOperationProblem, type Actor, type UserOperation } from "./rules";

/*
 * User management. Every action re-checks `users:manage`, then does its checks and its write in
 * ONE transaction that holds a dedicated advisory lock and re-reads the actor's role, so two
 * people can't race past "admins can't touch owners" or "at least one active owner remains".
 * Passwords are never logged or returned, except a freshly generated temporary password, which is
 * returned once to the admin who created it.
 */

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

/** Arbitrary constant for `pg_advisory_xact_lock` — serialises user-management writes. */
const USERS_LOCK_KEY = 74_201_337;

const idSchema = z.guid("That user no longer exists. Refresh the page.");
const nameSchema = z
  .string()
  .trim()
  .min(2, "Enter their name (at least 2 characters).")
  .max(80, "Keep the name under 80 characters.");
const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "That email address is too long.")
  .email("Enter a valid email address.");
const roleSchema = z.enum(roles, { error: "Choose a role." });

const createSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  role: roleSchema,
  passwordMode: z.enum(["generate", "manual"]),
  password: z.string().max(200, "That password is too long."),
});

const updateSchema = z.object({ id: idSchema, name: nameSchema, role: roleSchema });

interface TargetRow {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
}

const describe = (user: { name: string; email: string }) => `${user.name} <${user.email}>`;
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

function emailTaken() {
  return new FormError("Please fix the highlighted fields.", { email: "Someone already uses this email address." });
}

function isUniqueViolation(error: unknown) {
  const err = error as { code?: string; cause?: { code?: string } } | null;
  return err?.code === "23505" || err?.cause?.code === "23505";
}

/** Runs `fn` in a transaction that holds the user-management lock, with the actor re-verified inside it. */
async function withUsersLock<T>(actor: SessionUser, fn: (tx: Tx, me: Actor) => Promise<T>): Promise<T> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${sql.raw(String(USERS_LOCK_KEY))})`);
    const [fresh] = await tx
      .select({ role: users.role, isActive: users.isActive })
      .from(users)
      .where(eq(users.id, actor.id));
    if (!fresh?.isActive || !can(fresh.role, "users:manage"))
      throw new AuthError("You don't have permission to do that.");
    return fn(tx, { id: actor.id, role: fresh.role });
  });
}

async function loadTarget(tx: Tx, id: string): Promise<TargetRow> {
  const [target] = await tx
    .select({ id: users.id, email: users.email, name: users.name, role: users.role, isActive: users.isActive })
    .from(users)
    .where(eq(users.id, id))
    .for("update");
  if (!target) throw new FormError("That user no longer exists. Refresh the page.");
  return target;
}

/** Throws a friendly error unless `me` may perform `operation` on `target` (including the last-owner rule). */
async function assertAllowed(tx: Tx, me: Actor, target: TargetRow, operation: UserOperation, nextRole?: Role) {
  const problem = userOperationProblem(me, target, operation, nextRole);
  if (problem) throw new FormError(problem);
  if (removesActiveOwner(target, operation, nextRole)) {
    const [{ total }] = await tx
      .select({ total: count() })
      .from(users)
      .where(and(eq(users.role, "owner"), eq(users.isActive, true), ne(users.id, target.id)));
    if (total === 0) throw new FormError(LAST_OWNER_MESSAGE);
  }
}

function targetId(formData: FormData) {
  const parsed = idSchema.safeParse(formValue.text(formData, "id"));
  if (!parsed.success) throw new FormError("That user no longer exists. Refresh the page.");
  return parsed.data;
}

/* ---------------------------------------------------------------- actions */

export async function createUser(_state: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await assertPermission("users:manage");
    const values = parseOrThrow(createSchema, {
      name: formValue.text(formData, "name"),
      email: formValue.text(formData, "email"),
      role: formValue.text(formData, "role"),
      passwordMode: formValue.text(formData, "passwordMode") === "manual" ? "manual" : "generate",
      password: String(formData.get("password") ?? ""),
    });
    const roleProblem = (role: Role) =>
      role === "owner" ? "Only an owner can add another owner." : "You can’t give someone a role above your own.";
    if (!canAssignRole(actor.role, values.role)) {
      throw new FormError("Please fix the highlighted fields.", { role: roleProblem(values.role) });
    }

    const generated = values.passwordMode === "generate";
    let password = values.password;
    if (generated) {
      password = generateTemporaryPassword();
    } else {
      const problem = passwordProblem(password, { email: values.email, name: values.name });
      if (problem) throw new FormError("Please fix the highlighted fields.", { password: problem });
    }
    const passwordHash = await hashPassword(password);

    const created = await withUsersLock(actor, async (tx, me) => {
      if (!canAssignRole(me.role, values.role)) {
        throw new FormError("Please fix the highlighted fields.", { role: roleProblem(values.role) });
      }
      const [taken] = await tx.select({ id: users.id }).from(users).where(eq(users.email, values.email));
      if (taken) throw emailTaken();
      try {
        const [row] = await tx
          .insert(users)
          .values({
            email: values.email,
            name: values.name,
            role: values.role,
            passwordHash,
            passwordChangedAt: new Date(),
          })
          .returning({ id: users.id });
        return row;
      } catch (error) {
        if (isUniqueViolation(error)) throw emailTaken();
        throw error;
      }
    });

    await logActivity(actor, {
      action: "user.create",
      entityType: "user",
      entityId: created.id,
      summary: `Added ${describe(values)} as ${roleLabels[values.role]}`,
      changes: diff(null, { name: values.name, email: values.email, role: values.role }),
    });
    refresh();
    return {
      message: `${values.name} can now sign in.`,
      data: generated ? { password, name: values.name, email: values.email } : undefined,
    };
  });
}

export async function updateUser(_state: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await assertPermission("users:manage");
    const values = parseOrThrow(updateSchema, {
      id: formValue.text(formData, "id"),
      name: formValue.text(formData, "name"),
      role: formValue.text(formData, "role"),
    });

    const before = await withUsersLock(actor, async (tx, me) => {
      const target = await loadTarget(tx, values.id);
      await assertAllowed(tx, me, target, "edit");
      if (values.role !== target.role) await assertAllowed(tx, me, target, "change-role", values.role);
      if (values.name === target.name && values.role === target.role) return null;
      await tx.update(users).set({ name: values.name, role: values.role }).where(eq(users.id, target.id));
      return target;
    });
    if (!before) return "No changes to save.";

    const roleChanged = before.role !== values.role;
    await logActivity(actor, {
      action: roleChanged ? "user.role_change" : "user.update",
      entityType: "user",
      entityId: before.id,
      summary: roleChanged
        ? `Changed ${describe(before)} from ${roleLabels[before.role]} to ${roleLabels[values.role]}`
        : `Updated ${describe(before)}`,
      changes: diff({ name: before.name, role: before.role }, { name: values.name, role: values.role }),
    });
    refresh();
    return "User updated.";
  });
}

/** Deactivate (signs them out everywhere) or reactivate an account. */
export async function setUserActive(_state: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await assertPermission("users:manage");
    const id = targetId(formData);
    const active = formValue.text(formData, "active") === "true";

    const result = await withUsersLock(actor, async (tx, me) => {
      const target = await loadTarget(tx, id);
      await assertAllowed(tx, me, target, active ? "reactivate" : "deactivate");
      if (target.isActive === active) return { target, revoked: 0, changed: false };
      await tx.update(users).set({ isActive: active }).where(eq(users.id, target.id));
      const revoked = active
        ? []
        : await tx.delete(sessions).where(eq(sessions.userId, target.id)).returning({ id: sessions.id });
      return { target, revoked: revoked.length, changed: true };
    });
    const { target } = result;
    if (!result.changed) return active ? `${target.name} is already active.` : `${target.name} is already deactivated.`;

    await logActivity(actor, {
      action: active ? "user.reactivate" : "user.deactivate",
      entityType: "user",
      entityId: target.id,
      summary: active
        ? `Reactivated ${describe(target)}`
        : `Deactivated ${describe(target)} and ended ${plural(result.revoked, "session")}`,
      changes: { isActive: { from: !active, to: active } },
    });
    refresh();
    return active ? `${target.name} can sign in again.` : `${target.name} was deactivated and signed out everywhere.`;
  });
}

/** Replaces their password with a generated temporary one (shown once) and signs them out everywhere. */
export async function resetUserPassword(_state: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await assertPermission("users:manage");
    const id = targetId(formData);
    const password = generateTemporaryPassword();
    const passwordHash = await hashPassword(password);

    const { target, revoked } = await withUsersLock(actor, async (tx, me) => {
      const target = await loadTarget(tx, id);
      await assertAllowed(tx, me, target, "reset-password");
      await tx
        .update(users)
        .set({ passwordHash, passwordChangedAt: new Date(), failedLogins: 0, lockedUntil: null })
        .where(eq(users.id, target.id));
      const ended = await tx.delete(sessions).where(eq(sessions.userId, target.id)).returning({ id: sessions.id });
      return { target, revoked: ended.length };
    });
    // Let them sign in straight away with the new password, even after a burst of failed attempts.
    await resetRateLimit(`login:email:${target.email}`);

    await logActivity(actor, {
      action: "user.reset_password",
      entityType: "user",
      entityId: target.id,
      summary: `Reset the password for ${describe(target)} and ended ${plural(revoked, "session")}`,
    });
    refresh();
    return {
      message: `New temporary password created for ${target.name}.`,
      data: { password, name: target.name, email: target.email },
    };
  });
}

/** Clears a lock-out after repeated failed sign-ins. */
export async function unlockUser(_state: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await assertPermission("users:manage");
    const id = targetId(formData);

    const target = await withUsersLock(actor, async (tx, me) => {
      const target = await loadTarget(tx, id);
      await assertAllowed(tx, me, target, "unlock");
      await tx.update(users).set({ failedLogins: 0, lockedUntil: null }).where(eq(users.id, target.id));
      return target;
    });
    await resetRateLimit(`login:email:${target.email}`);

    await logActivity(actor, {
      action: "user.unlock",
      entityType: "user",
      entityId: target.id,
      summary: `Unlocked ${describe(target)}`,
    });
    refresh();
    return `${target.name} can try signing in again.`;
  });
}

/** Signs a user out of every browser (they can sign in again with their password). */
export async function revokeUserSessions(_state: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await assertPermission("users:manage");
    const id = targetId(formData);

    const { target, revoked } = await withUsersLock(actor, async (tx, me) => {
      const target = await loadTarget(tx, id);
      await assertAllowed(tx, me, target, "revoke-sessions");
      const ended = await tx.delete(sessions).where(eq(sessions.userId, target.id)).returning({ id: sessions.id });
      return { target, revoked: ended.length };
    });

    await logActivity(actor, {
      action: "user.revoke_sessions",
      entityType: "user",
      entityId: target.id,
      summary: `Signed ${describe(target)} out everywhere (${plural(revoked, "session")})`,
    });
    refresh();
    return `${target.name} was signed out of ${plural(revoked, "session")}.`;
  });
}

export async function deleteUser(_state: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await assertPermission("users:manage");
    const id = targetId(formData);

    const target = await withUsersLock(actor, async (tx, me) => {
      const target = await loadTarget(tx, id);
      await assertAllowed(tx, me, target, "delete");
      // Sessions cascade; their name stays on the activity log, notes and other history.
      await tx.delete(users).where(eq(users.id, target.id));
      return target;
    });

    await logActivity(actor, {
      action: "user.delete",
      entityType: "user",
      entityId: target.id,
      summary: `Deleted ${describe(target)} (${roleLabels[target.role]})`,
    });
    // No refresh(): the panel that sent this would vanish before showing its result. It navigates
    // back to the (freshly rendered) list itself once the toast is up.
    return `${target.name} was deleted.`;
  });
}
