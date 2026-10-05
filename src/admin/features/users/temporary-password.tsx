"use client";

import { KeyRound } from "lucide-react";

import { Button } from "@/admin/components/ui/button";
import { CopyButton } from "@/admin/components/ui/copy-button";

/**
 * Shows a freshly generated temporary password exactly once: it only lives in the parent's state
 * (the server stores just its hash and never logs it).
 */
export function TemporaryPassword({
  name,
  email,
  password,
  onDone,
}: {
  name: string;
  email: string;
  password: string;
  onDone: () => void;
}) {
  return (
    <div role="status" className="rounded-xl border border-leaf-600/30 bg-leaf-600/6 p-4" data-temporary-password>
      <p className="flex items-center gap-2 text-sm font-semibold text-navy-950">
        <KeyRound className="size-4 text-leaf-700" aria-hidden="true" />
        Temporary password for {name}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-slate-600">
        Shown only this once — copy it now and share it privately with {name} ({email}). They should change it from{" "}
        <span className="font-semibold">Your account</span> after signing in.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <code
          className="min-w-0 flex-1 truncate rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-[15px] tracking-wide text-navy-950 select-all"
          aria-label="Temporary password"
        >
          {password}
        </code>
        <CopyButton value={password} label="Copy" variant="secondary" size="md" absolute={false} />
      </div>
      <div className="mt-3 flex justify-end">
        <Button variant="ghost" size="sm" onClick={onDone}>
          Done — I’ve saved it
        </Button>
      </div>
    </div>
  );
}

export interface IssuedPassword {
  password: string;
  name: string;
  email: string;
}

/** The one-time password a create/reset action returned, if any. */
export function issuedPassword(data: Record<string, unknown> | undefined): IssuedPassword | null {
  if (!data || typeof data.password !== "string" || typeof data.name !== "string" || typeof data.email !== "string") {
    return null;
  }
  return { password: data.password, name: data.name, email: data.email };
}
