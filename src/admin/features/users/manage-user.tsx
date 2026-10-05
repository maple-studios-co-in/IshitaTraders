"use client";

import { KeyRound, LockOpen, LogOut, Trash2, UserCheck, UserX, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { ActionButton } from "@/admin/components/ui/action-button";
import { adminButton, ButtonLink } from "@/admin/components/ui/button";
import { ConfirmAction } from "@/admin/components/ui/confirm-action";
import { Field, Input, Select } from "@/admin/components/ui/form-controls";
import { Badge, Callout, Card, DetailList } from "@/admin/components/ui/primitives";
import { SubmitButton } from "@/admin/components/ui/submit-button";
import { useFormAction, useWrappedAction } from "@/admin/components/ui/use-form-action";
import { roleDescriptions, roleLabels, type Role } from "@/admin/content/types";
import { formatDateTime, pluralize } from "@/admin/lib/format";

import { deleteUser, resetUserPassword, revokeUserSessions, setUserActive, unlockUser, updateUser } from "./actions";
import type { UserStatus } from "./rules";
import { issuedPassword, TemporaryPassword, type IssuedPassword } from "./temporary-password";
import { RoleBadge, StatusBadge } from "./user-badges";

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  status: UserStatus;
  failedLogins: number;
  lockedUntil: string | null;
  lastLoginAt: string | null;
  passwordChangedAt: string | null;
  createdAt: string;
  activeSessions: number;
}

/** What the signed-in admin may do to this account (computed on the server from the same rules the actions enforce). */
export interface ManageAllowances {
  isSelf: boolean;
  /** Set when nothing may be changed (e.g. an admin looking at an owner). */
  readOnlyReason: string | null;
  roleOptions: Role[];
  roleLockedReason: string | null;
  deactivateBlockedReason: string | null;
  deleteBlockedReason: string | null;
  canResetPassword: boolean;
  canRevokeSessions: boolean;
}

export function ManageUser({ user, allow }: { user: ManagedUser; allow: ManageAllowances }) {
  const router = useRouter();
  const locked = user.status === "locked" || user.failedLogins > 0;
  const blockedReason = allow.deactivateBlockedReason ?? allow.deleteBlockedReason;

  return (
    <Card className="scroll-mt-24">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="min-w-0">
          <h2 className="flex flex-wrap items-center gap-2 font-display text-base font-bold text-navy-950">
            <span className="truncate">{user.name}</span>
            {allow.isSelf ? <Badge tone="blue">You</Badge> : null}
          </h2>
          <p className="mt-0.5 truncate text-sm text-slate-500">{user.email}</p>
        </div>
        <ButtonLink href="/admin/users" variant="ghost" size="icon-sm" aria-label="Close" title="Close" scroll={false}>
          <X />
        </ButtonLink>
      </div>

      <div className="flex flex-col gap-5 p-5">
        <DetailList
          items={[
            { label: "Role", value: <RoleBadge role={user.role} /> },
            { label: "Status", value: <StatusBadge status={user.status} /> },
            { label: "Last sign-in", value: user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Never" },
            { label: "Signed-in devices", value: pluralize(user.activeSessions, "session") },
            { label: "Password changed", value: user.passwordChangedAt ? formatDateTime(user.passwordChangedAt) : "—" },
            { label: "Added", value: formatDateTime(user.createdAt) },
            ...(user.failedLogins > 0 ? [{ label: "Failed sign-ins", value: String(user.failedLogins) }] : []),
            ...(user.status === "locked" && user.lockedUntil
              ? [{ label: "Locked until", value: formatDateTime(user.lockedUntil) }]
              : []),
          ]}
        />

        {allow.readOnlyReason ? (
          <Callout tone="info" title="View only">
            {allow.readOnlyReason}
          </Callout>
        ) : (
          <>
            {/* Re-mounts with the saved values after each change. */}
            <EditUserForm
              key={`${user.name}\u0000${user.role}`}
              user={user}
              roleOptions={allow.roleOptions}
              roleLockedReason={allow.roleLockedReason}
            />

            <section className="flex flex-col gap-3 border-t border-slate-100 pt-4">
              <h3 className="text-sm font-semibold text-slate-800">Sign-in access</h3>
              {allow.isSelf ? (
                <p className="text-xs leading-relaxed text-slate-500">
                  This is your own account. Change your password or sign out your other devices from{" "}
                  <Link
                    href="/admin/account"
                    className="font-semibold text-navy-800 underline-offset-2 hover:underline"
                  >
                    Your account
                  </Link>
                  .
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {locked ? (
                  <ActionButton action={unlockUser} fields={{ id: user.id }} pendingLabel="Unlocking…">
                    <LockOpen aria-hidden="true" /> Unlock
                  </ActionButton>
                ) : null}
                {allow.canResetPassword ? <ResetPasswordButton user={user} /> : null}
                {allow.canRevokeSessions && user.activeSessions > 0 ? (
                  <ConfirmAction
                    action={revokeUserSessions}
                    fields={{ id: user.id }}
                    title={`Sign ${user.name} out everywhere?`}
                    description={`Ends ${pluralize(user.activeSessions, "signed-in session")}. They can sign in again with their password.`}
                    confirmLabel="Sign out everywhere"
                    variant="secondary"
                    confirmVariant="primary"
                  >
                    <LogOut aria-hidden="true" /> Sign out everywhere
                  </ConfirmAction>
                ) : null}
              </div>
            </section>

            <section className="flex flex-col gap-3 border-t border-slate-100 pt-4">
              <h3 className="text-sm font-semibold text-slate-800">Account</h3>
              <div className="flex flex-wrap gap-2">
                {!user.isActive ? (
                  <ActionButton
                    action={setUserActive}
                    fields={{ id: user.id, active: "true" }}
                    pendingLabel="Reactivating…"
                  >
                    <UserCheck aria-hidden="true" /> Reactivate
                  </ActionButton>
                ) : allow.deactivateBlockedReason ? null : (
                  <ConfirmAction
                    action={setUserActive}
                    fields={{ id: user.id, active: "false" }}
                    title={`Deactivate ${user.name}?`}
                    description="They’re signed out everywhere straight away and can’t sign in until reactivated. Their history stays."
                    confirmLabel="Deactivate"
                    variant="secondary"
                  >
                    <UserX aria-hidden="true" /> Deactivate
                  </ConfirmAction>
                )}
                {allow.deleteBlockedReason ? null : (
                  <ConfirmAction
                    action={deleteUser}
                    fields={{ id: user.id }}
                    title={`Delete ${user.name}?`}
                    description={
                      <>
                        {user.email} will be removed and signed out everywhere. Their name stays on past activity and
                        notes. To pause access instead, deactivate the account. This can’t be undone.
                      </>
                    }
                    confirmLabel="Delete user"
                    onDone={() => router.replace("/admin/users", { scroll: false })}
                  >
                    <Trash2 aria-hidden="true" /> Delete
                  </ConfirmAction>
                )}
              </div>
              {blockedReason ? <p className="text-xs leading-relaxed text-slate-500">{blockedReason}</p> : null}
            </section>
          </>
        )}
      </div>
    </Card>
  );
}

function EditUserForm({
  user,
  roleOptions,
  roleLockedReason,
}: {
  user: ManagedUser;
  roleOptions: Role[];
  roleLockedReason: string | null;
}) {
  const [role, setRole] = useState<Role>(user.role);
  const { pending, onSubmit, errors } = useFormAction(updateUser);
  const options = roleOptions.includes(user.role) ? roleOptions : [user.role, ...roleOptions];
  const prefix = `user-${user.id}`;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={user.id} />
      <Field label="Name" htmlFor={`${prefix}-name`} error={errors.name} required>
        <Input
          id={`${prefix}-name`}
          name="name"
          defaultValue={user.name}
          maxLength={80}
          required
          aria-invalid={!!errors.name || undefined}
        />
      </Field>
      <Field
        label="Role"
        htmlFor={`${prefix}-role`}
        error={errors.role}
        hint={roleLockedReason ?? roleDescriptions[role]}
      >
        <Select
          id={`${prefix}-role`}
          name={roleLockedReason ? undefined : "role"}
          value={role}
          onChange={(event) => setRole(event.target.value as Role)}
          disabled={!!roleLockedReason}
          aria-invalid={!!errors.role || undefined}
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {roleLabels[option]}
            </option>
          ))}
        </Select>
        {/* Disabled fields aren't submitted; the action still checks the role server-side. */}
        {roleLockedReason ? <input type="hidden" name="role" value={user.role} /> : null}
      </Field>
      <div className="flex justify-end">
        <SubmitButton pending={pending} pendingLabel="Saving…">
          Save changes
        </SubmitButton>
      </div>
    </form>
  );
}

/** Confirm → generate a new temporary password → show it once with a copy button. */
function ResetPasswordButton({ user }: { user: ManagedUser }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [issued, setIssued] = useState<IssuedPassword | null>(null);
  const [, formAction] = useWrappedAction(resetUserPassword, {
    onSuccess: (state) => setIssued(issuedPassword(state.data)),
  });

  return (
    <>
      <button
        type="button"
        className={adminButton({ variant: "secondary", size: "sm" })}
        onClick={() => dialog.current?.showModal()}
      >
        <KeyRound aria-hidden="true" /> Reset password
      </button>
      <dialog
        ref={dialog}
        aria-label={`Reset ${user.name}’s password`}
        className="m-auto w-[min(480px,calc(100vw-2rem))] rounded-2xl border border-slate-200 p-0 shadow-2xl backdrop:bg-navy-950/45 backdrop:backdrop-blur-[2px]"
        // Closing (Done, Escape) forgets the password for good: it is shown only once.
        onClose={() => setIssued(null)}
        onClick={(event) => {
          if (event.target === dialog.current && !issued) dialog.current?.close();
        }}
      >
        {issued ? (
          <div className="p-6">
            <TemporaryPassword {...issued} onDone={() => dialog.current?.close()} />
          </div>
        ) : (
          <form action={formAction} className="flex flex-col gap-4 p-6">
            <input type="hidden" name="id" value={user.id} />
            <div>
              <h2 className="font-display text-lg font-bold text-navy-950">Reset {user.name}’s password?</h2>
              <div className="mt-1.5 text-sm leading-relaxed text-slate-600">
                A new temporary password replaces the current one, any lock-out is cleared and they’re signed out
                everywhere. You’ll see the new password once, to pass on to them.
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className={adminButton({ variant: "secondary" })}
                onClick={() => dialog.current?.close()}
              >
                Cancel
              </button>
              <SubmitButton pendingLabel="Resetting…">Reset password</SubmitButton>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
