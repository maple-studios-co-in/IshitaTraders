"use client";

import { CircleAlert, CircleCheck, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { ActionState } from "@/admin/lib/action-state";
import { cn } from "@/lib/cn";

type ToastTone = "success" | "error";
interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

const EVENT = "admin:toast";
let nextId = 1;

/** Show a toast from anywhere in the admin client code. */
export const toast = {
  success: (message: string) => emit("success", message),
  error: (message: string) => emit("error", message),
};

function emit(tone: ToastTone, message: string) {
  window.dispatchEvent(new CustomEvent<ToastItem>(EVENT, { detail: { id: nextId++, tone, message } }));
}

/**
 * Announces an action's result right away. Called from inside the action callback (not an effect),
 * so the toast still appears when the action removed the button that ran it.
 */
export function notifyResult(state: ActionState | undefined) {
  if (!state || state.status === "idle") return;
  if (state.status === "success") toast.success(state.message);
  else toast.error(state.message);
}

/** Toasts each new result of a `useActionState` action. */
export function useActionToast(state: ActionState) {
  const shown = useRef(0);
  useEffect(() => {
    if (state.status === "idle" || state.at === shown.current) return;
    shown.current = state.at;
    if (state.status === "success") toast.success(state.message);
    else toast.error(state.message);
  }, [state]);
}

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const onToast = (event: Event) => {
      const item = (event as CustomEvent<ToastItem>).detail;
      setItems((current) => [...current.slice(-3), item]);
      window.setTimeout(
        () => setItems((current) => current.filter((t) => t.id !== item.id)),
        item.tone === "error" ? 7000 : 5000,
      );
    };
    window.addEventListener(EVENT, onToast);
    return () => window.removeEventListener(EVENT, onToast);
  }, []);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed right-4 bottom-4 z-[60] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2"
    >
      {items.map((item) => (
        <div
          key={item.id}
          role={item.tone === "error" ? "alert" : "status"}
          className={cn(
            "pointer-events-auto flex items-start gap-3 rounded-xl border bg-white px-4 py-3 text-sm shadow-[0_18px_40px_-20px_rgb(15_39_74/0.45)]",
            "animate-[toast-in_220ms_cubic-bezier(0.16,1,0.3,1)]",
            item.tone === "success" ? "border-leaf-600/30" : "border-red-200",
          )}
        >
          {item.tone === "success" ? (
            <CircleCheck className="mt-0.5 size-4 shrink-0 text-leaf-600" aria-hidden="true" />
          ) : (
            <CircleAlert className="mt-0.5 size-4 shrink-0 text-red-600" aria-hidden="true" />
          )}
          <p className="min-w-0 flex-1 font-medium text-slate-800">{item.message}</p>
          <button
            type="button"
            onClick={() => setItems((current) => current.filter((t) => t.id !== item.id))}
            className="-mr-1 rounded p-0.5 text-slate-400 hover:text-slate-700"
            aria-label="Dismiss"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
