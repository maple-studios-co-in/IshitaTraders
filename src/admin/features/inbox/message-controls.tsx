"use client";

import { Mail, Trash2, UserCheck, UserX } from "lucide-react";
import { useActionState, useId } from "react";

import { ConfirmAction } from "@/admin/components/ui/confirm-action";
import { Select } from "@/admin/components/ui/form-controls";
import { SubmitButton } from "@/admin/components/ui/submit-button";
import { useActionToast } from "@/admin/components/ui/toaster";
import { messageStatusLabels, messageStatuses, type MessageStatus } from "@/admin/content/types";
import { idleState } from "@/admin/lib/action-state";

import { assignMessage, deleteMessage, markMessageUnread, updateMessageStatus } from "./actions";

export function MessageStatusForm({ id, status }: { id: string; status: MessageStatus }) {
  const [state, formAction] = useActionState(updateMessageStatus, idleState);
  const selectId = useId();
  useActionToast(state);
  return (
    <form action={formAction} className="flex items-end gap-2">
      <input type="hidden" name="id" value={id} />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <label htmlFor={selectId} className="text-sm font-semibold text-slate-800">
          Status
        </label>
        <Select id={selectId} name="status" defaultValue={status} key={status}>
          {messageStatuses.map((value) => (
            <option key={value} value={value}>
              {messageStatusLabels[value]}
            </option>
          ))}
        </Select>
      </div>
      <SubmitButton variant="secondary" pendingLabel="Saving…" className="h-10">
        Update
      </SubmitButton>
    </form>
  );
}

export function AssignButton({ id, assignedToMe }: { id: string; assignedToMe: boolean }) {
  const [state, formAction] = useActionState(assignMessage, idleState);
  useActionToast(state);
  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="assignee" value={assignedToMe ? "none" : "me"} />
      <SubmitButton variant="secondary" size="sm">
        {assignedToMe ? (
          <>
            <UserX aria-hidden="true" /> Unassign me
          </>
        ) : (
          <>
            <UserCheck aria-hidden="true" /> Assign to me
          </>
        )}
      </SubmitButton>
    </form>
  );
}

export function MarkUnreadButton({ id }: { id: string }) {
  const [state, formAction] = useActionState(markMessageUnread, idleState);
  useActionToast(state);
  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <SubmitButton variant="ghost" size="sm">
        <Mail aria-hidden="true" /> Mark as unread
      </SubmitButton>
    </form>
  );
}

export function DeleteMessageButton({ id, label }: { id: string; label: string }) {
  return (
    <ConfirmAction
      action={deleteMessage}
      fields={{ id }}
      title="Delete this message?"
      description={
        <>The message from {label} and its internal notes will be removed permanently. This can’t be undone.</>
      }
      confirmLabel="Delete message"
    >
      <Trash2 aria-hidden="true" /> Delete
    </ConfirmAction>
  );
}
