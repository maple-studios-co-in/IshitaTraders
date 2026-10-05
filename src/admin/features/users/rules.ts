/**
 * Who may do what to which account. Pure functions (no server imports): the Server Actions enforce
 * them inside a transaction, and the page uses the same rules to decide which buttons to show.
 */
import { canAssignRole } from "@/admin/config/permissions";
import { roleLabels, roles, type Role } from "@/admin/content/types";

export type UserOperation =
  "edit" | "change-role" | "deactivate" | "reactivate" | "reset-password" | "unlock" | "revoke-sessions" | "delete";

export interface Actor {
  id: string;
  role: Role;
}

export interface TargetUser {
  id: string;
  role: Role;
  isActive: boolean;
}

/** Why `actor` may not perform `operation` on `target`, or null when it's allowed. */
export function userOperationProblem(
  actor: Actor,
  target: TargetUser,
  operation: UserOperation,
  nextRole?: Role,
): string | null {
  const self = actor.id === target.id;
  if (target.role === "owner" && actor.role !== "owner") return "Only an owner can change an owner’s account.";
  switch (operation) {
    case "change-role":
      if (self) return "You can’t change your own role. Ask another owner to do it.";
      if (nextRole && !canAssignRole(actor.role, nextRole)) {
        return nextRole === "owner"
          ? "Only an owner can make someone an owner."
          : `You can’t give someone the ${roleLabels[nextRole]} role.`;
      }
      return null;
    case "deactivate":
      return self ? "You can’t deactivate your own account." : null;
    case "delete":
      return self ? "You can’t delete your own account." : null;
    case "reset-password":
      return self ? "Change your own password from Your account." : null;
    case "revoke-sessions":
      return self ? "Sign out your other devices from Your account." : null;
    default:
      return null;
  }
}

/** Whether the operation takes an active owner away (so at least one other active owner must remain). */
export function removesActiveOwner(target: TargetUser, operation: UserOperation, nextRole?: Role) {
  if (target.role !== "owner" || !target.isActive) return false;
  return (
    operation === "deactivate" ||
    operation === "delete" ||
    (operation === "change-role" && nextRole !== undefined && nextRole !== "owner")
  );
}

export const LAST_OWNER_MESSAGE = "This is the only active owner. Make someone else an owner first.";

/** Roles `actor` can give to new or existing users (never above their own; only owners make owners). */
export function assignableRoles(actor: Role): Role[] {
  return roles.filter((role) => canAssignRole(actor, role));
}

export type UserStatus = "active" | "locked" | "deactivated";

export function userStatus(
  user: { isActive: boolean; lockedUntil: Date | string | null },
  now = Date.now(),
): UserStatus {
  if (!user.isActive) return "deactivated";
  if (user.lockedUntil && new Date(user.lockedUntil).getTime() > now) return "locked";
  return "active";
}
