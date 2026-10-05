"use client";

import type { ReactNode } from "react";

import type { FormAction } from "@/admin/lib/action-state";

import type { AdminButtonSize, AdminButtonVariant } from "./button";
import { SubmitButton } from "./submit-button";
import { useWrappedAction } from "./use-form-action";

/**
 * A one-click Server Action button for non-destructive actions (unlock, reactivate, revoke one
 * session…). Destructive actions use `<ConfirmAction>` instead.
 */
export function ActionButton({
  action,
  fields,
  children,
  pendingLabel,
  variant = "secondary",
  size = "sm",
  className,
  onDone,
}: {
  action: FormAction;
  /** Hidden fields sent with the action (e.g. `{ id }`). */
  fields: Record<string, string>;
  children: ReactNode;
  pendingLabel?: ReactNode;
  variant?: AdminButtonVariant;
  size?: AdminButtonSize;
  className?: string;
  onDone?: () => void;
}) {
  const [, formAction] = useWrappedAction(action, { onSuccess: () => onDone?.() });

  return (
    <form action={formAction} className="contents">
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <SubmitButton variant={variant} size={size} className={className} pendingLabel={pendingLabel}>
        {children}
      </SubmitButton>
    </form>
  );
}
