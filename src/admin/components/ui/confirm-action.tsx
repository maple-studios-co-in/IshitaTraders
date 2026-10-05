"use client";

import { useRef, type ReactNode } from "react";

import type { FormAction } from "@/admin/lib/action-state";

import { adminButton, type AdminButtonSize, type AdminButtonVariant } from "./button";
import { SubmitButton } from "./submit-button";
import { useWrappedAction } from "./use-form-action";

interface ConfirmActionProps {
  action: FormAction;
  /** Hidden fields sent with the action (e.g. `{ id }`). */
  fields: Record<string, string>;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  children: ReactNode;
  variant?: AdminButtonVariant;
  size?: AdminButtonSize;
  confirmVariant?: AdminButtonVariant;
  className?: string;
  ariaLabel?: string;
  /** Called after the action succeeds (e.g. to close a drawer). */
  onDone?: () => void;
}

/** A button that asks for confirmation in a native modal dialog before running a destructive action. */
export function ConfirmAction({
  action,
  fields,
  title,
  description,
  confirmLabel,
  children,
  variant = "danger-ghost",
  size = "sm",
  confirmVariant = "danger",
  className,
  ariaLabel,
  onDone,
}: ConfirmActionProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [, formAction] = useWrappedAction(action, {
    onSuccess: () => {
      dialog.current?.close();
      onDone?.();
    },
  });

  return (
    <>
      <button
        type="button"
        aria-label={ariaLabel}
        className={adminButton({ variant, size, className })}
        onClick={() => dialog.current?.showModal()}
      >
        {children}
      </button>
      <dialog
        ref={dialog}
        className="m-auto w-[min(440px,calc(100vw-2rem))] rounded-2xl border border-slate-200 p-0 shadow-2xl backdrop:bg-navy-950/45 backdrop:backdrop-blur-[2px]"
        onClick={(event) => {
          if (event.target === dialog.current) dialog.current?.close();
        }}
      >
        <form action={formAction} className="flex flex-col gap-4 p-6">
          {Object.entries(fields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <div>
            <h2 className="font-display text-lg font-bold text-navy-950">{title}</h2>
            <div className="mt-1.5 text-sm leading-relaxed text-slate-600">{description}</div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className={adminButton({ variant: "secondary" })}
              onClick={() => dialog.current?.close()}
            >
              Cancel
            </button>
            <SubmitButton variant={confirmVariant}>{confirmLabel}</SubmitButton>
          </div>
        </form>
      </dialog>
    </>
  );
}
