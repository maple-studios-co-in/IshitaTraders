"use client";

import { useFormStatus } from "react-dom";

import { useWrappedAction } from "@/admin/components/ui/use-form-action";
import { cn } from "@/lib/cn";

import { toggleRedirect } from "./actions";

/** On/paused switch for one redirect (a plain form: works without JavaScript). */
export function RedirectToggle({ id, isActive, source }: { id: string; isActive: boolean; source: string }) {
  const [, formAction] = useWrappedAction(toggleRedirect);
  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <SwitchButton isActive={isActive} source={source} />
    </form>
  );
}

function SwitchButton({ isActive, source }: { isActive: boolean; source: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      role="switch"
      aria-checked={isActive}
      aria-label={`Redirect from ${source}`}
      title={isActive ? "On — click to pause" : "Paused — click to turn on"}
      disabled={pending}
      className="group inline-flex items-center gap-2 rounded-full py-1 pr-1 text-xs font-semibold text-slate-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:opacity-60"
    >
      <span
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors",
          isActive ? "bg-leaf-600" : "bg-slate-300",
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow transition-transform",
            isActive && "translate-x-4",
            pending && "animate-pulse",
          )}
        />
      </span>
      <span className={isActive ? "text-leaf-700" : "text-slate-500"}>{isActive ? "On" : "Paused"}</span>
    </button>
  );
}
