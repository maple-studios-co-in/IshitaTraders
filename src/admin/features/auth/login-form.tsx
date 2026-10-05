"use client";

import { CircleAlert, Eye, EyeOff, LogIn } from "lucide-react";
import { useActionState, useState } from "react";

import { Field, Input } from "@/admin/components/ui/form-controls";
import { SubmitButton } from "@/admin/components/ui/submit-button";
import { idleState } from "@/admin/lib/action-state";

import { signIn } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [state, formAction] = useActionState(signIn, idleState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="next" value={next} />
      <Field label="Email address" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          autoFocus
          placeholder="you@example.com"
        />
      </Field>
      <Field label="Password" htmlFor="password">
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            className="pr-10"
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

      {state.status === "error" ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {state.message}
        </p>
      ) : null}

      <SubmitButton size="lg" className="w-full" pendingLabel="Signing in…">
        <LogIn aria-hidden="true" />
        Sign in
      </SubmitButton>
    </form>
  );
}
