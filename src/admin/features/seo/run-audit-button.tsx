"use client";

import { ScanSearch } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import type { AdminButtonSize } from "@/admin/components/ui/button";
import { SubmitButton } from "@/admin/components/ui/submit-button";
import { useActionToast } from "@/admin/components/ui/toaster";
import { idleState } from "@/admin/lib/action-state";
import { cn } from "@/lib/cn";

import { runAudit } from "./audit-actions";

/** Typical length of an audit, for the progress bar (it keeps creeping, never completes, until the run ends). */
const EXPECTED_SECONDS = 20;

/** Starts an audit. Audits take 10–20 seconds, so it shows elapsed time and a progress bar meanwhile. */
export function RunAuditButton({
  label = "Run audit",
  hint,
  size = "md",
  align = "end",
}: {
  label?: string;
  hint?: string;
  size?: AdminButtonSize;
  align?: "start" | "center" | "end";
}) {
  const [state, formAction, pending] = useActionState(runAudit, idleState);
  const [startedAt, setStartedAt] = useState(0);
  const [now, setNow] = useState(0);
  const router = useRouter();
  useActionToast(state);

  // Show the new report. Refreshing here (not in the action) lets the toast fire first, even when this
  // button belongs to the empty state that the new report replaces.
  useEffect(() => {
    if (state.status === "success") router.refresh();
  }, [state, router]);

  useEffect(() => {
    if (!pending) return;
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, [pending]);

  const elapsed = pending && startedAt ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0;
  const progress = Math.min(94, 6 + (elapsed / EXPECTED_SECONDS) * 88);

  return (
    <form
      action={formAction}
      onSubmit={() => {
        const time = Date.now();
        setStartedAt(time);
        setNow(time);
      }}
      className={cn(
        "flex flex-col gap-2",
        align === "end" && "items-start sm:items-end",
        align === "center" && "items-center",
        align === "start" && "items-start",
      )}
    >
      <SubmitButton size={size} pendingLabel={`Auditing… ${elapsed} s`}>
        <ScanSearch aria-hidden="true" /> {label}
      </SubmitButton>
      {pending ? (
        <div className="flex w-56 flex-col gap-1.5" role="status">
          <span className="h-1.5 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
            <span
              className="block h-full rounded-full bg-brand-500 transition-[width] duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </span>
          <span className="text-xs text-slate-500">Crawling pages and checking links — usually 10–20 seconds.</span>
        </div>
      ) : hint ? (
        <p className="text-xs text-slate-500">{hint}</p>
      ) : null}
    </form>
  );
}
