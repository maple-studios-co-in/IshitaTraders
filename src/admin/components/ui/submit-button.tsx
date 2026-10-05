"use client";

import { LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { adminButton, type AdminButtonSize, type AdminButtonVariant } from "./button";

interface SubmitButtonProps {
  children: ReactNode;
  pendingLabel?: ReactNode;
  variant?: AdminButtonVariant;
  size?: AdminButtonSize;
  className?: string;
  disabled?: boolean;
  name?: string;
  value?: string;
  /** For forms submitted through `useFormAction` (not a form action), pass its `pending`. */
  pending?: boolean;
}

/** Submit button that disables itself and shows a spinner while its form's action runs. */
export function SubmitButton({
  children,
  pendingLabel,
  variant,
  size,
  className,
  disabled,
  name,
  value,
  pending: pendingProp,
}: SubmitButtonProps) {
  const status = useFormStatus();
  const pending = pendingProp ?? status.pending;
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending || disabled}
      aria-busy={pending || undefined}
      className={adminButton({ variant, size, className })}
    >
      {pending ? (
        <>
          <LoaderCircle className="animate-spin" aria-hidden="true" />
          {pendingLabel ?? children}
        </>
      ) : (
        children
      )}
    </button>
  );
}
