"use client";

import { useEffect } from "react";

import { BulkBar, SelectAll } from "@/admin/components/ui/bulk-bar";
import { Field, Input, Select } from "@/admin/components/ui/form-controls";
import { SubmitButton } from "@/admin/components/ui/submit-button";
import { useFormAction } from "@/admin/components/ui/use-form-action";
import { enquiryStatuses, enquiryStatusLabels, type EnquiryStatus } from "@/admin/content/types";

import { bulkUpdateEnquiries, markEnquiryRead, updateEnquiry } from "./actions";
import { enquiryStatusHints } from "./presentation";

/** Marks the enquiry read once it has actually been opened (not on link prefetch). */
export function MarkEnquiryRead({ id, isRead }: { id: string; isRead: boolean }) {
  useEffect(() => {
    if (!isRead) void markEnquiryRead(id).catch(() => {});
  }, [id, isRead]);
  return null;
}

/** "2026-10-05T14:30" in India time, for a datetime-local input. */
function toLocalInput(value: string | null) {
  if (!value) return "";
  const date = new Date(new Date(value).getTime() + 5.5 * 3_600_000);
  return date.toISOString().slice(0, 16);
}

export function EnquiryStatusForm({
  id,
  status,
  assignedTo,
  followUpAt,
  assignees,
}: {
  id: string;
  status: EnquiryStatus;
  assignedTo: string | null;
  followUpAt: string | null;
  assignees: { id: string; name: string }[];
}) {
  const { pending, onSubmit, errors } = useFormAction(updateEnquiry);
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={id} />
      <Field label="Status" htmlFor="enquiry-status" error={errors.status}>
        <Select id="enquiry-status" name="status" defaultValue={status}>
          {enquiryStatuses.map((value) => (
            <option key={value} value={value}>
              {enquiryStatusLabels[value]} — {enquiryStatusHints[value]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Handled by" htmlFor="enquiry-assignee" error={errors.assignedTo}>
        <Select id="enquiry-assignee" name="assignedTo" defaultValue={assignedTo ?? ""}>
          <option value="">Nobody yet</option>
          {assignees.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field
        label="Follow up on"
        htmlFor="enquiry-follow-up"
        error={errors.followUpAt}
        hint="Shows on the dashboard when it’s due."
      >
        <Input id="enquiry-follow-up" name="followUpAt" type="datetime-local" defaultValue={toLocalInput(followUpAt)} />
      </Field>
      <SubmitButton pending={pending} pendingLabel="Saving…">
        Save
      </SubmitButton>
    </form>
  );
}

export const ENQUIRY_BULK_FORM = "bulk-enquiries";

export function EnquiriesSelectAll() {
  return <SelectAll formId={ENQUIRY_BULK_FORM} label="Select all enquiries on this page" />;
}

export function EnquiriesBulkBar({ canDelete }: { canDelete: boolean }) {
  return (
    <BulkBar
      formId={ENQUIRY_BULK_FORM}
      action={bulkUpdateEnquiries}
      noun={["enquiry", "enquiries"]}
      operations={[
        { value: "read", label: "Mark as read" },
        { value: "unread", label: "Mark as unread" },
        ...enquiryStatuses.map((status) => ({
          value: `status:${status}`,
          label: `Move to “${enquiryStatusLabels[status]}”`,
        })),
        ...(canDelete ? [{ value: "delete", label: "Delete", destructive: true }] : []),
      ]}
    />
  );
}
