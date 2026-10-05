import type { Role } from "@/admin/content/types";

/** Role hierarchy: each role inherits everything granted to the roles below it. */
const rank: Record<Role, number> = { viewer: 0, editor: 1, admin: 2, owner: 3 };

/** The minimum role each capability needs. */
export const permissions = {
  "dashboard:view": "viewer",
  "products:read": "viewer",
  "products:write": "editor",
  "products:delete": "editor",
  "enquiries:read": "viewer",
  "enquiries:write": "editor",
  "enquiries:delete": "admin",
  "inbox:read": "viewer",
  "inbox:write": "editor",
  "content:write": "editor",
  "seo:write": "editor",
  "pages:write": "editor",
  "media:write": "editor",
  "redirects:write": "editor",
  "activity:read": "admin",
  "users:manage": "admin",
  "integrations:manage": "admin",
  "backup:export": "admin",
} satisfies Record<string, Role>;

export type Permission = keyof typeof permissions;

export function can(role: Role, permission: Permission) {
  return rank[role] >= rank[permissions[permission]];
}

/** Whether `actor` may assign `target` (nobody can create a role above their own; only owners make owners). */
export function canAssignRole(actor: Role, target: Role) {
  if (target === "owner") return actor === "owner";
  return rank[actor] >= rank[target];
}
