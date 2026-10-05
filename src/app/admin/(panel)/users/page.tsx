import { Users } from "lucide-react";
import type { Metadata } from "next";

import { ButtonLink } from "@/admin/components/ui/button";
import { param } from "@/admin/components/ui/listing";
import {
  Badge,
  Callout,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  Table,
  TD,
  TH,
} from "@/admin/components/ui/primitives";
import { roleDescriptions, roles } from "@/admin/content/types";
import { CreateUserForm } from "@/admin/features/users/create-user-form";
import { ManageUser, type ManageAllowances } from "@/admin/features/users/manage-user";
import { listUsers, type UserListItem } from "@/admin/features/users/queries";
import {
  assignableRoles,
  LAST_OWNER_MESSAGE,
  removesActiveOwner,
  userOperationProblem,
} from "@/admin/features/users/rules";
import { RoleBadge, StatusBadge } from "@/admin/features/users/user-badges";
import { formatDate, formatDateTime, timeAgo } from "@/admin/lib/format";
import { requirePermission } from "@/admin/server/auth/guard";
import { PASSWORD_MIN_LENGTH } from "@/admin/server/auth/password";
import type { SessionUser } from "@/admin/server/auth/session";

export const metadata: Metadata = { title: "Users & roles" };

/** The same rules the Server Actions enforce, used here only to decide what to show. */
function allowancesFor(actor: SessionUser, target: UserListItem, activeOwners: number): ManageAllowances {
  const me = { id: actor.id, role: actor.role };
  const isSelf = actor.id === target.id;
  const onlyOwner = removesActiveOwner(target, "deactivate") && activeOwners <= 1;
  return {
    isSelf,
    readOnlyReason:
      target.role === "owner" && actor.role !== "owner"
        ? "Only an owner can change an owner’s account, reset its password or sign it out."
        : null,
    roleOptions: assignableRoles(actor.role),
    roleLockedReason: isSelf
      ? "You can’t change your own role."
      : onlyOwner
        ? "The only active owner must stay an owner."
        : null,
    deactivateBlockedReason: userOperationProblem(me, target, "deactivate") ?? (onlyOwner ? LAST_OWNER_MESSAGE : null),
    deleteBlockedReason: userOperationProblem(me, target, "delete") ?? (onlyOwner ? LAST_OWNER_MESSAGE : null),
    canResetPassword: userOperationProblem(me, target, "reset-password") === null,
    canRevokeSessions: userOperationProblem(me, target, "revoke-sessions") === null,
  };
}

export default async function UsersPage({ searchParams }: PageProps<"/admin/users">) {
  const actor = await requirePermission("users:manage");
  const selectedId = param(await searchParams, "user");
  const rows = await listUsers();
  const selected = selectedId ? rows.find((row) => row.id === selectedId) : undefined;
  const activeOwners = rows.filter((row) => row.role === "owner" && row.isActive).length;
  const canSignIn = rows.filter((row) => row.status === "active").length;
  const roleOptions = assignableRoles(actor.role);

  return (
    <>
      <PageHeader
        title="Users & roles"
        description="Who can sign in to this admin and what each person can do."
        breadcrumbs={[{ label: "Administration" }, { label: "Users & roles" }]}
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader
              title="Team"
              description={`${rows.length} ${rows.length === 1 ? "user" : "users"} · ${canSignIn} can sign in`}
            />
            {rows.length === 0 ? (
              <EmptyState icon={<Users />} title="No users yet" description="Add the first user with the form." />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <TH>User</TH>
                    <TH>Role</TH>
                    <TH>Status</TH>
                    <TH>Last sign-in</TH>
                    <TH align="center">Sessions</TH>
                    <TH>Added</TH>
                    <TH>
                      <span className="sr-only">Actions</span>
                    </TH>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      className={row.id === selected?.id ? "bg-surface/70" : undefined}
                      data-user-row={row.email}
                    >
                      <TD>
                        <div className="flex items-center gap-2 font-semibold text-slate-800">
                          {row.name}
                          {row.id === actor.id ? <Badge tone="blue">You</Badge> : null}
                        </div>
                        <div className="text-xs text-slate-500">{row.email}</div>
                      </TD>
                      <TD>
                        <RoleBadge role={row.role} />
                      </TD>
                      <TD>
                        <StatusBadge status={row.status} />
                      </TD>
                      <TD className="whitespace-nowrap">
                        {row.lastLoginAt ? (
                          <span title={formatDateTime(row.lastLoginAt)}>{timeAgo(row.lastLoginAt)}</span>
                        ) : (
                          <span className="text-slate-400">Never</span>
                        )}
                      </TD>
                      <TD align="center">{row.activeSessions}</TD>
                      <TD className="whitespace-nowrap">{formatDate(row.createdAt)}</TD>
                      <TD align="right">
                        <ButtonLink
                          href={`/admin/users?user=${row.id}#manage-user`}
                          variant={row.id === selected?.id ? "primary" : "secondary"}
                          size="sm"
                          aria-label={`Manage ${row.name}`}
                        >
                          Manage
                        </ButtonLink>
                      </TD>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>

          <Card>
            <CardHeader title="Roles" description="Each role includes everything the roles below it can do." />
            <dl className="divide-y divide-slate-100">
              {roles.map((role) => (
                <div key={role} className="flex items-start gap-4 px-5 py-3">
                  <dt className="w-20 shrink-0">
                    <RoleBadge role={role} />
                  </dt>
                  <dd className="text-sm text-slate-600">{roleDescriptions[role]}</dd>
                </div>
              ))}
            </dl>
            <p className="border-t border-slate-100 px-5 py-3 text-xs leading-relaxed text-slate-500">
              Only owners can add or change owners. Nobody can change their own role, deactivate or delete themselves
              here, and there is always at least one active owner.
            </p>
          </Card>
        </div>

        <div id="manage-user" className="flex scroll-mt-24 flex-col gap-6 xl:sticky xl:top-24">
          {selected ? (
            <ManageUser
              key={selected.id}
              user={{
                id: selected.id,
                name: selected.name,
                email: selected.email,
                role: selected.role,
                isActive: selected.isActive,
                status: selected.status,
                failedLogins: selected.failedLogins,
                lockedUntil: selected.lockedUntil?.toISOString() ?? null,
                lastLoginAt: selected.lastLoginAt?.toISOString() ?? null,
                passwordChangedAt: selected.passwordChangedAt?.toISOString() ?? null,
                createdAt: selected.createdAt.toISOString(),
                activeSessions: selected.activeSessions,
              }}
              allow={allowancesFor(actor, selected, activeOwners)}
            />
          ) : (
            <Card>
              <CardHeader
                title="Add a user"
                description="They sign in at /admin with their email and the password you set here."
              />
              <div className="flex flex-col gap-4 p-5">
                {selectedId ? <Callout tone="warning">That user no longer exists.</Callout> : null}
                <CreateUserForm
                  roleOptions={roleOptions}
                  defaultRole={roleOptions.includes("editor") ? "editor" : (roleOptions.at(-1) ?? "viewer")}
                  passwordMinLength={PASSWORD_MIN_LENGTH}
                />
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
