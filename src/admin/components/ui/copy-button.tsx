"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { adminButton, type AdminButtonSize, type AdminButtonVariant } from "./button";
import { toast } from "./toaster";

/** Copies text (absolute URL when `value` is a path) to the clipboard. */
export function CopyButton({
  value,
  label = "Copy link",
  variant = "ghost",
  size = "sm",
  absolute = true,
}: {
  value: string;
  label?: string;
  variant?: AdminButtonVariant;
  size?: AdminButtonSize;
  absolute?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={adminButton({ variant, size })}
      onClick={async () => {
        const text = absolute && value.startsWith("/") ? new URL(value, window.location.origin).toString() : value;
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        } catch {
          toast.error("Couldn’t copy — select and copy it manually.");
        }
      }}
    >
      {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      {copied ? "Copied" : label}
    </button>
  );
}
