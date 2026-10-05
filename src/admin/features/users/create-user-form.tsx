"use client";

import { Eye, EyeOff, UserPlus } from "lucide-react";
import { useState } from "react";

import { Field, Input, Select } from "@/admin/components/ui/form-controls";
import { SubmitButton } from "@/admin/components/ui/submit-button";
import { useFormAction } from "@/admin/components/ui/use-form-action";
import { roleDescriptions, roleLabels, type Role } from "@/admin/content/types";
import { cn } from "@/lib/cn";

import { createUser } from "./actions";
import { issuedPassword, TemporaryPassword, type IssuedPassword } from "./temporary-password";

type PasswordMode = "generate" | "manual";

const passwordModes = [
  {
    value: "generate",
    label: "Generate a temporary password",
    hint: () => "Recommended. 16 random letters and digits, shown to you once.",
  },
  {
    value: "manual",
    label: "Type a password myself",
    hint: (min: number) => `At least ${min} characters with letters and numbers.`,
  },
] as const;

/** Adds a user. A generated temporary password is shown once, with a copy button. */
export function CreateUserForm({
  roleOptions,
  defaultRole,
  passwordMinLength,
}: {
  roleOptions: Role[];
  defaultRole: Role;
  passwordMinLength: number;
}) {
  const [role, setRole] = useState<Role>(defaultRole);
  const [mode, setMode] = useState<PasswordMode>("generate");
  const [showPassword, setShowPassword] = useState(false);
  const [issued, setIssued] = useState<IssuedPassword | null>(null);
  // A fresh form after each successful add (resetting a form with controlled fields isn't reliable).
  const [formKey, setFormKey] = useState(0);
  const { pending, onSubmit, errors } = useFormAction(createUser, {
    onSuccess: (state) => {
      setIssued(issuedPassword(state.data));
      setRole(defaultRole);
      setMode("generate");
      setShowPassword(false);
      setFormKey((key) => key + 1);
    },
  });

  return (
    <div className="flex flex-col gap-5">
      {issued ? <TemporaryPassword {...issued} onDone={() => setIssued(null)} /> : null}

      <form key={formKey} onSubmit={onSubmit} className="flex flex-col gap-4" autoComplete="off">
        <Field label="Full name" htmlFor="user-new-name" error={errors.name} required>
          <Input id="user-new-name" name="name" maxLength={80} required aria-invalid={!!errors.name || undefined} />
        </Field>
        <Field
          label="Email address"
          htmlFor="user-new-email"
          error={errors.email}
          hint="They sign in with this address."
          required
        >
          <Input
            id="user-new-email"
            name="email"
            type="email"
            maxLength={254}
            required
            aria-invalid={!!errors.email || undefined}
          />
        </Field>
        <Field label="Role" htmlFor="user-new-role" error={errors.role} hint={roleDescriptions[role]} required>
          <Select
            id="user-new-role"
            name="role"
            value={role}
            onChange={(event) => setRole(event.target.value as Role)}
            aria-invalid={!!errors.role || undefined}
          >
            {roleOptions.map((option) => (
              <option key={option} value={option}>
                {roleLabels[option]}
              </option>
            ))}
          </Select>
        </Field>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-sm font-semibold text-slate-800">Password</legend>
          {passwordModes.map((option) => (
            <label
              key={option.value}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                mode === option.value ? "border-navy-800/40 bg-surface" : "border-slate-200 hover:border-slate-300",
              )}
            >
              <input
                type="radio"
                name="passwordMode"
                value={option.value}
                checked={mode === option.value}
                onChange={() => setMode(option.value)}
                className="mt-0.5 size-4 accent-navy-800"
              />
              <span className="flex flex-col">
                <span className="text-sm font-semibold text-slate-800">{option.label}</span>
                <span className="text-xs text-slate-500">{option.hint(passwordMinLength)}</span>
              </span>
            </label>
          ))}
          {mode === "manual" ? (
            <Field label="Temporary password" htmlFor="user-new-password" error={errors.password} className="mt-1">
              <div className="relative">
                <Input
                  id="user-new-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  maxLength={200}
                  required
                  className="pr-10"
                  aria-invalid={!!errors.password || undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </Field>
          ) : null}
        </fieldset>

        <div className="flex justify-end">
          <SubmitButton pending={pending} pendingLabel="Adding…">
            <UserPlus aria-hidden="true" /> Add user
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
