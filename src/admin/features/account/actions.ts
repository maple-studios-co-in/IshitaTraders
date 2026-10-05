"use server";

import { and, eq, ne } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";

import type { ActionState } from "@/admin/lib/action-state";
import { FormError, formValue, parseOrThrow, runAction } from "@/admin/server/action";
import { diff, logActivity } from "@/admin/server/audit";
import { AuthError, getCurrentSession } from "@/admin/server/auth/guard";
import { hashPassword, passwordProblem, verifyPassword } from "@/admin/server/auth/password";
import type { ActiveSession } from "@/admin/server/auth/session";
import { getDb } from "@/admin/server/db/client";
import { sessions, users } from "@/admin/server/db/schema";
import { rateLimit, resetRateLimit } from "@/admin/server/security/rate-limit";

import { describeUserAgent } from "./user-agent";

/*
 * Self-service account actions for any signed-in user. Changing the email or password needs the
 * current password; those checks are rate-limited per account so a hijacked session can't be used
 * to guess it. Passwords are never logged.
 */

const VERIFY_ATTEMPTS = 5;
const VERIFY_WINDOW_SECONDS = 15 * 60;
const FIX_FIELDS = "Please fix the highlighted fields.";

const nameSchema = z
  .string()
  .trim()
  .min(2, "Enter your name (at least 2 characters).")
  .max(80, "Keep your name under 80 characters.");
const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "That email address is too long.")
  .email("Enter a valid email address.");
const currentPasswordSchema = z.string().min(1, "Enter your current password.").max(200, "That password is too long.");

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

async function requireSession(): Promise<ActiveSession> {
  const session = await getCurrentSession();
  if (!session) throw new AuthError("Your session has expired. Sign in again.");
  return session;
}

async function loadAccount(userId: string) {
  const db = await getDb();
  const [row] = await db
    .select({ id: users.id, email: users.email, name: users.name, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, userId));
  if (!row) throw new AuthError("Your session has expired. Sign in again.");
  return row;
}

function isUniqueViolation(error: unknown) {
  const err = error as { code?: string; cause?: { code?: string } } | null;
  return err?.code === "23505" || err?.cause?.code === "23505";
}

/** Verifies the current password, at most VERIFY_ATTEMPTS times per window per account. */
async function verifyCurrentPassword(session: ActiveSession, passwordHash: string, password: string, purpose: string) {
  const key = `account:verify:${session.user.id}`;
  const limit = await rateLimit(key, VERIFY_ATTEMPTS, VERIFY_WINDOW_SECONDS);
  if (!limit.ok) {
    const minutes = Math.max(1, Math.ceil((limit.resetAt.getTime() - Date.now()) / 60_000));
    throw new FormError(`Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`);
  }
  if (!(await verifyPassword(password, passwordHash))) {
    await logActivity(session.user, {
      action: "account.verify_failed",
      entityType: "user",
      entityId: session.user.id,
      summary: `Entered a wrong current password while ${purpose}`,
    });
    throw new FormError(FIX_FIELDS, { currentPassword: "That isn’t your current password." });
  }
  await resetRateLimit(key);
}

export async function updateProfile(_state: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const session = await requireSession();
    const { name } = parseOrThrow(z.object({ name: nameSchema }), { name: formValue.text(formData, "name") });
    const me = await loadAccount(session.user.id);
    if (me.name === name) return "No changes to save.";

    const db = await getDb();
    await db.update(users).set({ name }).where(eq(users.id, me.id));
    await logActivity(session.user, {
      action: "account.update_profile",
      entityType: "user",
      entityId: me.id,
      summary: "Changed their display name",
      changes: diff({ name: me.name }, { name }),
    });
    refresh();
    return "Name updated.";
  });
}

export async function changeEmail(_state: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const session = await requireSession();
    const values = parseOrThrow(z.object({ email: emailSchema, currentPassword: currentPasswordSchema }), {
      email: formValue.text(formData, "email"),
      currentPassword: String(formData.get("currentPassword") ?? ""),
    });
    const me = await loadAccount(session.user.id);
    if (values.email === me.email) throw new FormError(FIX_FIELDS, { email: "That’s already your email address." });

    // Password first, so this form can't be used to probe which addresses have accounts.
    await verifyCurrentPassword(session, me.passwordHash, values.currentPassword, "changing their email");
    const taken = () => new FormError(FIX_FIELDS, { email: "Another user already has this email address." });
    const db = await getDb();
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, values.email), ne(users.id, me.id)));
    if (existing) throw taken();
    try {
      await db.update(users).set({ email: values.email }).where(eq(users.id, me.id));
    } catch (error) {
      if (isUniqueViolation(error)) throw taken();
      throw error;
    }

    await logActivity(session.user, {
      action: "account.change_email",
      entityType: "user",
      entityId: me.id,
      summary: `Changed their sign-in email from ${me.email} to ${values.email}`,
      changes: { email: { from: me.email, to: values.email } },
    });
    refresh();
    return "Email updated — use the new address next time you sign in.";
  });
}

/** Changes the password and signs out every other session (this browser stays signed in). */
export async function changePassword(_state: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const session = await requireSession();
    const values = parseOrThrow(
      z.object({
        currentPassword: currentPasswordSchema,
        newPassword: z.string().min(1, "Enter a new password.").max(200, "That password is too long."),
        confirmPassword: z.string().max(200),
      }),
      {
        currentPassword: String(formData.get("currentPassword") ?? ""),
        newPassword: String(formData.get("newPassword") ?? ""),
        confirmPassword: String(formData.get("confirmPassword") ?? ""),
      },
    );
    const me = await loadAccount(session.user.id);
    const problem = passwordProblem(values.newPassword, { email: me.email, name: me.name });
    if (problem) throw new FormError(FIX_FIELDS, { newPassword: problem });
    if (values.confirmPassword !== values.newPassword) {
      throw new FormError(FIX_FIELDS, { confirmPassword: "The two new passwords don’t match." });
    }
    if (values.newPassword === values.currentPassword) {
      throw new FormError(FIX_FIELDS, { newPassword: "Choose a different password from your current one." });
    }

    await verifyCurrentPassword(session, me.passwordHash, values.currentPassword, "changing their password");
    const passwordHash = await hashPassword(values.newPassword);

    const db = await getDb();
    const signedOut = await db.transaction(async (tx) => {
      await tx.update(users).set({ passwordHash, passwordChangedAt: new Date() }).where(eq(users.id, me.id));
      const ended = await tx
        .delete(sessions)
        .where(and(eq(sessions.userId, me.id), ne(sessions.id, session.id)))
        .returning({ id: sessions.id });
      return ended.length;
    });

    await logActivity(session.user, {
      action: "account.change_password",
      entityType: "user",
      entityId: me.id,
      summary: `Changed their password and signed out ${plural(signedOut, "other session")}`,
    });
    refresh();
    return signedOut > 0 ? `Password changed. Signed out ${plural(signedOut, "other session")}.` : "Password changed.";
  });
}

/** Signs out one of the user's own sessions (never someone else's, never this browser's). */
export async function revokeSession(_state: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const session = await requireSession();
    const id = formValue.text(formData, "id");
    if (!/^[0-9a-f]{64}$/.test(id)) return "That session has already ended.";
    if (id === session.id) throw new FormError("That’s this browser — use Sign out at the top instead.");

    const db = await getDb();
    const [ended] = await db
      .delete(sessions)
      .where(and(eq(sessions.id, id), eq(sessions.userId, session.user.id)))
      .returning({ userAgent: sessions.userAgent });
    if (!ended) return "That session has already ended.";

    await logActivity(session.user, {
      action: "account.revoke_session",
      entityType: "user",
      entityId: session.user.id,
      summary: `Signed out a session (${describeUserAgent(ended.userAgent)})`,
    });
    refresh();
    return `Signed out ${describeUserAgent(ended.userAgent)}.`;
  });
}

export async function revokeOtherSessions(): Promise<ActionState> {
  return runAction(async () => {
    const session = await requireSession();
    const db = await getDb();
    const ended = await db
      .delete(sessions)
      .where(and(eq(sessions.userId, session.user.id), ne(sessions.id, session.id)))
      .returning({ id: sessions.id });

    if (ended.length > 0) {
      await logActivity(session.user, {
        action: "account.revoke_other_sessions",
        entityType: "user",
        entityId: session.user.id,
        summary: `Signed out everywhere else (${plural(ended.length, "session")})`,
      });
    }
    refresh();
    return ended.length > 0
      ? `Signed out ${plural(ended.length, "other session")}.`
      : "No other sessions were signed in.";
  });
}
