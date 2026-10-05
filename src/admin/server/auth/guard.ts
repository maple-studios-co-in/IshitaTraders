import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { can, type Permission } from "@/admin/config/permissions";

import { readSession, type ActiveSession, type SessionUser } from "./session";

/**
 * The data-access-layer auth checks. Pages call `requireUser`/`requirePermission`; Server Actions
 * and Route Handlers call `assertPermission`. Layouts alone are never trusted (they don't re-run
 * on client navigation).
 */
export const getCurrentSession = cache(async (): Promise<ActiveSession | null> => readSession());

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => (await getCurrentSession())?.user ?? null);

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  return user;
}

export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await requireUser();
  if (!can(user.role, permission)) redirect(`/admin?denied=${encodeURIComponent(permission)}`);
  return user;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

export async function assertPermission(permission: Permission): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("Your session has expired. Sign in again.");
  if (!can(user.role, permission)) throw new AuthError("You don't have permission to do that.");
  return user;
}
