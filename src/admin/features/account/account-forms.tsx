"use client";

import { Eye, EyeOff, LogOut, Monitor } from "lucide-react";
import { useRef, useState } from "react";

import { ConfirmAction } from "@/admin/components/ui/confirm-action";
import { Field, Input } from "@/admin/components/ui/form-controls";
import { Badge } from "@/admin/components/ui/primitives";
import { SubmitButton } from "@/admin/components/ui/submit-button";
import { useFormAction, useWrappedAction } from "@/admin/components/ui/use-form-action";
import { formatDateTime, pluralize } from "@/admin/lib/format";

import { changeEmail, changePassword, revokeOtherSessions, revokeSession, updateProfile } from "./actions";

/** Display name. Keyed by the saved name on the page, so it re-mounts with the new value after a save. */
export function ProfileForm({ name }: { name: string }) {
  const { pending, onSubmit, errors } = useFormAction(updateProfile);

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field
        label="Display name"
        htmlFor="account-name"
        error={errors.name}
        hint="Shown in the admin and on notes and activity."
        required
      >
        <Input
          id="account-name"
          name="name"
          defaultValue={name}
          autoComplete="name"
          maxLength={80}
          required
          aria-invalid={!!errors.name || undefined}
        />
      </Field>
      <div className="flex justify-end">
        <SubmitButton pending={pending} pendingLabel="Saving…">
          Save name
        </SubmitButton>
      </div>
    </form>
  );
}

export function EmailForm({ email }: { email: string }) {
  const form = useRef<HTMLFormElement>(null);
  const { pending, onSubmit, errors } = useFormAction(changeEmail, { onSuccess: () => form.current?.reset() });

  return (
    <form ref={form} onSubmit={onSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-slate-600">
        You sign in with <span className="font-semibold text-slate-800">{email}</span>.
      </p>
      <Field label="New email address" htmlFor="account-email" error={errors.email} required>
        <Input
          id="account-email"
          name="email"
          type="email"
          autoComplete="email"
          maxLength={254}
          required
          aria-invalid={!!errors.email || undefined}
        />
      </Field>
      <Field
        label="Current password"
        htmlFor="account-email-password"
        error={errors.currentPassword}
        hint="To confirm it’s you."
        required
      >
        <Input
          id="account-email-password"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          maxLength={200}
          required
          aria-invalid={!!errors.currentPassword || undefined}
        />
      </Field>
      <div className="flex justify-end">
        <SubmitButton pending={pending} pendingLabel="Saving…">
          Change email
        </SubmitButton>
      </div>
    </form>
  );
}

export function PasswordForm({ minLength }: { minLength: number }) {
  const form = useRef<HTMLFormElement>(null);
  const [visible, setVisible] = useState(false);
  const { pending, onSubmit, errors } = useFormAction(changePassword, {
    onSuccess: () => {
      form.current?.reset();
      setVisible(false);
    },
  });
  const type = visible ? "text" : "password";

  return (
    <form ref={form} onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field label="Current password" htmlFor="account-current-password" error={errors.currentPassword} required>
        <Input
          id="account-current-password"
          name="currentPassword"
          type={type}
          autoComplete="current-password"
          maxLength={200}
          required
          aria-invalid={!!errors.currentPassword || undefined}
        />
      </Field>
      <Field
        label="New password"
        htmlFor="account-new-password"
        error={errors.newPassword}
        hint={`At least ${minLength} characters, mixing letters and numbers. Not your name or email.`}
        required
      >
        <Input
          id="account-new-password"
          name="newPassword"
          type={type}
          autoComplete="new-password"
          minLength={minLength}
          maxLength={200}
          required
          aria-invalid={!!errors.newPassword || undefined}
        />
      </Field>
      <Field label="Confirm new password" htmlFor="account-confirm-password" error={errors.confirmPassword} required>
        <Input
          id="account-confirm-password"
          name="confirmPassword"
          type={type}
          autoComplete="new-password"
          maxLength={200}
          required
          aria-invalid={!!errors.confirmPassword || undefined}
        />
      </Field>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-navy-900"
          aria-pressed={visible}
        >
          {visible ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
          {visible ? "Hide passwords" : "Show passwords"}
        </button>
        <SubmitButton pending={pending} pendingLabel="Changing…">
          Change password
        </SubmitButton>
      </div>
      <p className="text-xs leading-relaxed text-slate-500">
        Changing your password signs you out on every other device. This browser stays signed in.
      </p>
    </form>
  );
}

export interface SessionView {
  id: string;
  device: string;
  ip: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  current: boolean;
}

/** This user's signed-in browsers, newest activity first, with "This device" on top. */
export function SessionsList({ sessions }: { sessions: SessionView[] }) {
  const [, revokeAction] = useWrappedAction(revokeSession);
  const others = sessions.filter((session) => !session.current).length;

  return (
    <div className="flex flex-col">
      <ul className="divide-y divide-slate-100">
        {sessions.map((session) => (
          <li
            key={session.id}
            className="flex items-start gap-3 px-5 py-3.5"
            data-session={session.current ? "current" : "other"}
          >
            <span
              className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface text-navy-800"
              aria-hidden="true"
            >
              <Monitor className="size-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-800">
                {session.device}
                {session.current ? <Badge tone="leaf">This device</Badge> : null}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                {session.ip ? `IP ${session.ip} · ` : ""}Signed in {formatDateTime(session.createdAt)}
                <br />
                Last active {formatDateTime(session.lastSeenAt)} · Expires {formatDateTime(session.expiresAt)}
              </p>
            </div>
            {session.current ? null : (
              <form action={revokeAction}>
                <input type="hidden" name="id" value={session.id} />
                <SubmitButton variant="ghost" size="sm" pendingLabel="Signing out…">
                  Sign out
                </SubmitButton>
              </form>
            )}
          </li>
        ))}
      </ul>
      {others > 0 ? (
        <div className="flex justify-end border-t border-slate-100 px-5 py-3">
          <ConfirmAction
            action={revokeOtherSessions}
            fields={{}}
            title="Sign out everywhere else?"
            description={`Ends ${pluralize(others, "other session")}. This browser stays signed in.`}
            confirmLabel="Sign out everywhere else"
            variant="secondary"
            confirmVariant="primary"
          >
            <LogOut aria-hidden="true" /> Sign out everywhere else
          </ConfirmAction>
        </div>
      ) : null}
    </div>
  );
}
