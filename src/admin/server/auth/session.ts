import "server-only";

import { randomBytes } from "node:crypto";

import { and, eq, ne } from "drizzle-orm";
import { cookies } from "next/headers";

import type { Role } from "@/admin/content/types";

import { getDb } from "../db/client";
import { sessions, users } from "../db/schema";
import { env } from "../env";
import { sha256, type RequestMeta } from "../security/request";

/** Idle timeout: a session unused for this long expires. */
const IDLE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** Absolute lifetime: sign in again after this, however active. */
const ABSOLUTE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const TOUCH_INTERVAL_MS = 5 * 60 * 1000;

/** Secure, host-only cookie in production; a plain name for http://localhost. */
export function sessionCookieName() {
  return secureCookies() ? "__Host-ishita_admin" : "ishita_admin";
}

export const SESSION_COOKIE_NAMES = ["__Host-ishita_admin", "ishita_admin"] as const;

function secureCookies() {
  return env.isVercel || process.env.ADMIN_SECURE_COOKIES === "true";
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface ActiveSession {
  id: string;
  createdAt: Date;
  expiresAt: Date;
  user: SessionUser;
}

/** Starts a session and sets the cookie. Only callable from Server Actions / Route Handlers. */
export async function createSession(userId: string, meta: RequestMeta) {
  const db = await getDb();
  const token = randomBytes(32).toString("base64url");
  const now = Date.now();
  await db.insert(sessions).values({
    id: sha256(token),
    userId,
    expiresAt: new Date(now + IDLE_TTL_MS),
    ip: meta.ip,
    userAgent: meta.userAgent,
  });
  const store = await cookies();
  store.set(sessionCookieName(), token, {
    httpOnly: true,
    secure: secureCookies(),
    sameSite: "lax",
    path: "/",
    expires: new Date(now + ABSOLUTE_TTL_MS),
  });
}

/** Resolves the signed-in user from the cookie, sliding the idle expiry. Never throws. */
export async function readSession(): Promise<ActiveSession | null> {
  const store = await cookies();
  const token = store.get(sessionCookieName())?.value;
  if (!token || token.length > 128) return null;

  try {
    const db = await getDb();
    const id = sha256(token);
    const [row] = await db
      .select({
        id: sessions.id,
        createdAt: sessions.createdAt,
        expiresAt: sessions.expiresAt,
        lastSeenAt: sessions.lastSeenAt,
        userId: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        isActive: users.isActive,
      })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(eq(sessions.id, id))
      .limit(1);

    const now = Date.now();
    if (!row || !row.isActive || row.expiresAt.getTime() <= now) return null;
    if (now - row.createdAt.getTime() > ABSOLUTE_TTL_MS) return null;

    let expiresAt = row.expiresAt;
    if (now - row.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
      expiresAt = new Date(Math.min(now + IDLE_TTL_MS, row.createdAt.getTime() + ABSOLUTE_TTL_MS));
      await db
        .update(sessions)
        .set({ lastSeenAt: new Date(now), expiresAt })
        .where(eq(sessions.id, id));
    }

    return {
      id,
      createdAt: row.createdAt,
      expiresAt,
      user: { id: row.userId, email: row.email, name: row.name, role: row.role },
    };
  } catch {
    return null;
  }
}

/** Signs the current browser out. */
export async function destroyCurrentSession() {
  const store = await cookies();
  const token = store.get(sessionCookieName())?.value;
  store.delete(sessionCookieName());
  if (!token) return;
  const db = await getDb();
  await db.delete(sessions).where(eq(sessions.id, sha256(token)));
}

/** Signs a user out everywhere except (optionally) the current session. */
export async function destroyUserSessions(userId: string, exceptSessionId?: string) {
  const db = await getDb();
  await db
    .delete(sessions)
    .where(
      exceptSessionId
        ? and(eq(sessions.userId, userId), ne(sessions.id, exceptSessionId))
        : eq(sessions.userId, userId),
    );
}
