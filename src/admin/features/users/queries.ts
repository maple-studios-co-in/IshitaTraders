import "server-only";

import { count, gt } from "drizzle-orm";

import { roles, type Role } from "@/admin/content/types";
import { getDb } from "@/admin/server/db/client";
import { sessions, users } from "@/admin/server/db/schema";

import { userStatus, type UserStatus } from "./rules";

export interface UserListItem {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  failedLogins: number;
  lockedUntil: Date | null;
  lastLoginAt: Date | null;
  passwordChangedAt: Date | null;
  createdAt: Date;
  /** Signed-in browsers whose session hasn't expired. */
  activeSessions: number;
  status: UserStatus;
}

/** Every admin user (never the password hash), owners first, with their live session counts. */
export async function listUsers(): Promise<UserListItem[]> {
  const db = await getDb();
  const [rows, sessionCounts] = await Promise.all([
    db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        isActive: users.isActive,
        failedLogins: users.failedLogins,
        lockedUntil: users.lockedUntil,
        lastLoginAt: users.lastLoginAt,
        passwordChangedAt: users.passwordChangedAt,
        createdAt: users.createdAt,
      })
      .from(users),
    db
      .select({ userId: sessions.userId, total: count() })
      .from(sessions)
      .where(gt(sessions.expiresAt, new Date()))
      .groupBy(sessions.userId),
  ]);
  const totals = new Map(sessionCounts.map((row) => [row.userId, row.total]));
  const now = Date.now();
  return rows
    .map((row) => ({ ...row, activeSessions: totals.get(row.id) ?? 0, status: userStatus(row, now) }))
    .sort((a, b) => roles.indexOf(a.role) - roles.indexOf(b.role) || a.name.localeCompare(b.name, "en"));
}
