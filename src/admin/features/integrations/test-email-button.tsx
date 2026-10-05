"use client";

import { Send } from "lucide-react";
import { useActionState } from "react";

import { SubmitButton } from "@/admin/components/ui/submit-button";
import { useActionToast } from "@/admin/components/ui/toaster";
import { idleState } from "@/admin/lib/action-state";
import { cn } from "@/lib/cn";

import { sendTestEmail } from "./actions";

/** "Send test email" with the result shown inline (and as a toast). */
export function TestEmailButton() {
  const [state, formAction] = useActionState(sendTestEmail, idleState);
  useActionToast(state);
  return (
    <form action={formAction} className="flex flex-col items-start gap-2">
      <SubmitButton variant="secondary" size="sm" pendingLabel="Sending…">
        <Send aria-hidden="true" /> Send test email
      </SubmitButton>
      <p
        role="status"
        className={cn(
          "text-sm",
          state.status === "success" ? "text-leaf-700" : "text-red-700",
          state.status === "idle" && "sr-only",
        )}
      >
        {state.status === "idle" ? "" : state.message}
      </p>
    </form>
  );
}
