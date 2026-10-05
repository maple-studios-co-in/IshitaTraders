import { Badge, type BadgeTone } from "@/admin/components/ui/primitives";
import { roleLabels, type Role } from "@/admin/content/types";

import type { UserStatus } from "./rules";

const roleTones: Record<Role, BadgeTone> = { owner: "violet", admin: "navy", editor: "blue", viewer: "slate" };

export function RoleBadge({ role }: { role: Role }) {
  return <Badge tone={roleTones[role]}>{roleLabels[role]}</Badge>;
}

const statusBadges: Record<UserStatus, { label: string; tone: BadgeTone }> = {
  active: { label: "Active", tone: "leaf" },
  locked: { label: "Locked", tone: "amber" },
  deactivated: { label: "Deactivated", tone: "red" },
};

export function StatusBadge({ status }: { status: UserStatus }) {
  const badge = statusBadges[status];
  return (
    <Badge tone={badge.tone} dot>
      {badge.label}
    </Badge>
  );
}
