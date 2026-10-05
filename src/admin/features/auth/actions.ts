"use server";

import { createHmac, timingSafeEqual } from "node:crypto";

import { count, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import type { ActionState } from "@/admin/lib/action-state";
import { logActivity } from "@/admin/server/audit";
import { getCurrentUser } from "@/admin/server/auth/guard";
import { hashPassword, needsRehash, verifyPassword } from "@/admin/server/auth/password";
import { createSession, destroyCurrentSession } from "@/admin/server/auth/session";
import { DatabaseUnavailableError, getDb } from "@/admin/server/db/client";
import { sessions, settings, users } from "@/admin/server/db/schema";
import { env } from "@/admin/server/env";
import { rateLimit, resetRateLimit } from "@/admin/server/security/rate-limit";
import { getRequestMeta, hashIp } from "@/admin/server/security/request";

const MAX_FAILED_LOGINS = 8;
const LOCK_MINUTES = 15;
// Verifying against a throwaway hash keeps "unknown email" as slow as "wrong password".
const DUMMY_HASH =
  "scrypt$32768$8$1$c2FsdHNhbHRzYWx0c2FsdA$7nNfE0NGF0d0k6b6m3v0R1pq9mY2XfV6H0n0eP0pQm2b8U2vXo2yP7r6m6p3N5u8mF0xUqk6r8Q0x2qVh7Y1Gg";

const failure = (message: string): ActionState => ({ status: "error", message, at: Date.now() });

/** Settings row remembering which ADMIN_PASSWORD value was last applied to the owner (a keyed hash, never the password). */
const ENV_PASSWORD_KEY = "__owner_env_password";
const envPasswordFingerprint = () =>
  createHmac("sha256", env.authSecret).update(`owner-env-password:${env.adminPassword}`).digest("hex");

type UserRow = typeof users.$inferSelect;

/**
 * Server-side password recovery for the owner: when whoever runs the site changes ADMIN_PASSWORD
 * (in .env.local or the host's environment settings), signing in with the new value resets the
 * owner's password once — and clears a lock-out. After that, the password set under "Your account"
 * applies again until ADMIN_PASSWORD changes. Returns the updated user when a reset happened.
 */
async function applyEnvPasswordReset(user: UserRow, email: string, password: string): Promise<UserRow | null> {
  if (user.role !== "owner" || !env.adminEmail || !env.adminPassword || email !== env.adminEmail) return null;
  if (!constantTimeEqual(password, env.adminPassword)) return null;
  const db = await getDb();
  const fingerprint = envPasswordFingerprint();
  const [stored] = await db.select({ value: settings.value }).from(settings).where(eq(settings.key, ENV_PASSWORD_KEY));
  if (stored?.value === fingerprint) return null;

  const remember = () =>
    db
      .insert(settings)
      .values({ key: ENV_PASSWORD_KEY, value: fingerprint })
      .onConflictDoUpdate({ target: settings.key, set: { value: fingerprint, updatedAt: new Date() } });
  if (await verifyPassword(password, user.passwordHash)) {
    await remember();
    return null;
  }

  const [updated] = await db
    .update(users)
    .set({
      passwordHash: await hashPassword(password),
      passwordChangedAt: new Date(),
      failedLogins: 0,
      lockedUntil: null,
    })
    .where(eq(users.id, user.id))
    .returning();
  // Whoever knew the old password is signed out everywhere.
  await db.delete(sessions).where(eq(sessions.userId, user.id));
  await remember();
  await logActivity(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    {
      action: "user.password_reset_env",
      entityType: "user",
      entityId: user.id,
      summary: "Owner password reset from the ADMIN_PASSWORD setting",
    },
  );
  return updated;
}

/** Only redirect back into the admin, never to another site. */
function safeNext(value: FormDataEntryValue | null) {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/admin") && !next.startsWith("//") && !next.includes("\\") ? next : "/admin";
}

function constantTimeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function signIn(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));
  if (!email || !password) return failure("Enter your email and password.");

  let userId: string;
  try {
    const meta = await getRequestMeta();
    const ipKey = `login:ip:${hashIp(meta.ip) || "unknown"}`;
    const [byIp, byAccount] = await Promise.all([
      rateLimit(ipKey, 20, 15 * 60),
      rateLimit(`login:email:${email}`, 10, 15 * 60),
    ]);
    if (!byIp.ok || !byAccount.ok) return failure("Too many sign-in attempts. Please wait 15 minutes and try again.");

    const db = await getDb();
    let [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    // First run: the owner account is created from ADMIN_EMAIL / ADMIN_PASSWORD on its first sign-in.
    if (!user) {
      const [{ total }] = await db.select({ total: count() }).from(users);
      if (
        total === 0 &&
        env.adminEmail &&
        env.adminPassword &&
        email === env.adminEmail &&
        constantTimeEqual(password, env.adminPassword)
      ) {
        [user] = await db
          .insert(users)
          .values({
            email,
            name: env.adminName,
            role: "owner",
            passwordHash: await hashPassword(password),
            passwordChangedAt: new Date(),
          })
          .returning();
        await logActivity(
          { id: user.id, email: user.email, name: user.name, role: user.role },
          {
            action: "user.bootstrap",
            entityType: "user",
            entityId: user.id,
            summary: "Created the owner account on first sign-in",
          },
        );
        await db
          .insert(settings)
          .values({ key: ENV_PASSWORD_KEY, value: envPasswordFingerprint() })
          .onConflictDoNothing();
      }
    }

    if (!user) {
      await verifyPassword(password, DUMMY_HASH);
      return failure("Incorrect email or password.");
    }

    user = (await applyEnvPasswordReset(user, email, password)) ?? user;

    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
      return failure(
        `This account is temporarily locked after repeated failed attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
      );
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      const failed = user.failedLogins + 1;
      await db
        .update(users)
        .set({
          failedLogins: failed,
          lockedUntil: failed >= MAX_FAILED_LOGINS ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null,
        })
        .where(eq(users.id, user.id));
      return failure("Incorrect email or password.");
    }

    if (!user.isActive) return failure("This account has been deactivated. Ask the owner to restore access.");

    await db
      .update(users)
      .set({
        failedLogins: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        ...(needsRehash(user.passwordHash) ? { passwordHash: await hashPassword(password) } : {}),
      })
      .where(eq(users.id, user.id));
    await resetRateLimit(`login:email:${email}`);
    await createSession(user.id, meta);
    await logActivity(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      {
        action: "auth.sign_in",
        entityType: "user",
        entityId: user.id,
        summary: "Signed in",
      },
    );
    userId = user.id;
  } catch (error) {
    if (error instanceof DatabaseUnavailableError) return failure(error.message);
    console.error("[auth] sign-in failed", error);
    return failure("We couldn't sign you in right now. Please try again.");
  }

  if (userId) redirect(next);
  return failure("We couldn't sign you in right now. Please try again.");
}

export async function signOut() {
  const user = await getCurrentUser();
  await destroyCurrentSession();
  if (user)
    await logActivity(user, { action: "auth.sign_out", entityType: "user", entityId: user.id, summary: "Signed out" });
  redirect("/admin/login");
}
