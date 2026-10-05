"use client";

import {
  Archive,
  ArrowDownLeft,
  ArrowUpRight,
  Ban,
  CheckCheck,
  LoaderCircle,
  Mail,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { adminButton, type AdminButtonVariant } from "@/admin/components/ui/button";
import { Table, TD, TH } from "@/admin/components/ui/primitives";
import { SubmitButton } from "@/admin/components/ui/submit-button";
import { useActionToast } from "@/admin/components/ui/toaster";
import type { MessageChannel, MessageDirection, MessageSource, MessageStatus } from "@/admin/content/types";
import { idleState, type ActionState } from "@/admin/lib/action-state";
import { cn } from "@/lib/cn";

import { bulkUpdateMessages } from "./actions";
import { ChannelLabel, MessageStatusBadge } from "./presentation";

/** One inbox row, pre-formatted on the server (times are strings so hydration always matches). */
export interface MessageRowView {
  id: string;
  channel: MessageChannel;
  direction: MessageDirection;
  status: MessageStatus;
  isRead: boolean;
  source: MessageSource;
  contact: string;
  contactDetail: string;
  subject: string;
  snippet: string;
  productName: string | null;
  timeIso: string;
  timeLabel: string;
  timeTitle: string;
}

function BulkButton({
  op,
  variant = "secondary",
  children,
}: {
  op: string;
  variant?: AdminButtonVariant;
  children: ReactNode;
}) {
  const { pending, data } = useFormStatus();
  const active = pending && data?.get("op") === op;
  return (
    <button
      type="submit"
      name="op"
      value={op}
      disabled={pending}
      aria-busy={active || undefined}
      className={adminButton({ variant, size: "sm" })}
    >
      {active ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

/**
 * The inbox list: checkboxes + bulk actions (read/unread, close, spam, delete for admins).
 * Stays mounted when a filter empties (it renders `empty` itself), so the result of an action
 * that removed the last rows is still announced.
 */
export function MessageTable({
  rows,
  canWrite,
  canDelete,
  showingSpam,
  summary,
  empty,
}: {
  rows: MessageRowView[];
  canWrite: boolean;
  canDelete: boolean;
  showingSpam: boolean;
  summary: ReactNode;
  empty: ReactNode;
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [toDelete, setToDelete] = useState<string[]>([]);
  const deleteDialog = useRef<HTMLDialogElement>(null);
  const [state, formAction] = useActionState(async (previous: ActionState, formData: FormData) => {
    const result = await bulkUpdateMessages(previous, formData);
    if (result.status === "success") {
      setSelected(new Set());
      deleteDialog.current?.close();
    }
    return result;
  }, idleState);
  useActionToast(state);

  // Only ids still on this page count as selected (rows change after actions and navigation).
  const visible = rows.filter((row) => selected.has(row.id)).map((row) => row.id);
  const allSelected = rows.length > 0 && visible.length === rows.length;
  const someSelected = visible.length > 0 && !allSelected;
  const headerBox = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (headerBox.current) headerBox.current.indeterminate = someSelected;
  }, [someSelected]);

  const toggle = (id: string, checked: boolean) =>
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  const toggleAll = (checked: boolean) => setSelected(checked ? new Set(rows.map((row) => row.id)) : new Set());
  const confirmDelete = () => {
    setToDelete(visible);
    deleteDialog.current?.showModal();
  };

  return (
    <>
      {rows.length === 0 ? (
        empty
      ) : (
        <>
          <div
            className={cn(
              "flex min-h-12 flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-2",
              visible.length > 0 ? "bg-surface/80" : "bg-white",
            )}
          >
            {visible.length > 0 && canWrite ? (
              <>
                <p className="mr-1 text-sm font-semibold text-navy-900">{visible.length} selected</p>
                <form action={formAction} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="ids" value={visible.join(",")} />
                  <BulkButton op="read">
                    <CheckCheck aria-hidden="true" /> Mark read
                  </BulkButton>
                  <BulkButton op="unread">
                    <Mail aria-hidden="true" /> Mark unread
                  </BulkButton>
                  <BulkButton op="close">
                    <Archive aria-hidden="true" /> Close
                  </BulkButton>
                  {showingSpam ? (
                    <BulkButton op="reopen">
                      <RotateCcw aria-hidden="true" /> Not spam
                    </BulkButton>
                  ) : (
                    <BulkButton op="spam">
                      <Ban aria-hidden="true" /> Spam
                    </BulkButton>
                  )}
                </form>
                {canDelete ? (
                  <button
                    type="button"
                    className={adminButton({ variant: "danger-ghost", size: "sm" })}
                    onClick={confirmDelete}
                  >
                    <Trash2 aria-hidden="true" /> Delete
                  </button>
                ) : null}
                <button
                  type="button"
                  className={adminButton({ variant: "ghost", size: "sm", className: "ml-auto" })}
                  onClick={() => setSelected(new Set())}
                >
                  <X aria-hidden="true" /> Clear
                </button>
              </>
            ) : (
              <p className="text-sm text-slate-500">{summary}</p>
            )}
          </div>

          <Table>
            <thead>
              <tr>
                {canWrite ? (
                  <TH className="w-10 pr-0">
                    <input
                      ref={headerBox}
                      type="checkbox"
                      className="size-4 rounded border-slate-300 accent-navy-800"
                      checked={allSelected}
                      onChange={(event) => toggleAll(event.target.checked)}
                      aria-label="Select all messages on this page"
                    />
                  </TH>
                ) : null}
                <TH>Channel</TH>
                <TH>Contact</TH>
                <TH>Message</TH>
                <TH>Product</TH>
                <TH>Received</TH>
                <TH>Status</TH>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const href = `/admin/inbox/${row.id}`;
                const isSelected = selected.has(row.id);
                return (
                  <tr
                    key={row.id}
                    className={cn(
                      "transition-colors hover:bg-slate-50/80",
                      !row.isRead && "bg-brand-500/[0.035]",
                      isSelected && "bg-surface",
                    )}
                  >
                    {canWrite ? (
                      <TD className="w-10 pr-0">
                        <input
                          type="checkbox"
                          className="size-4 rounded border-slate-300 accent-navy-800"
                          checked={isSelected}
                          onChange={(event) => toggle(row.id, event.target.checked)}
                          aria-label={`Select message from ${row.contact}`}
                        />
                      </TD>
                    ) : null}
                    <TD>
                      <ChannelLabel channel={row.channel} />
                    </TD>
                    <TD className="max-w-[220px]">
                      <Link href={href} prefetch={false} className="group flex items-start gap-2">
                        <span
                          aria-hidden="true"
                          className={cn(
                            "mt-1.5 size-2 shrink-0 rounded-full",
                            row.isRead ? "bg-transparent" : "bg-brand-500",
                          )}
                        />
                        <span className="min-w-0">
                          <span
                            className={cn(
                              "admin-break block text-slate-800 group-hover:text-navy-800 group-hover:underline",
                              !row.isRead && "font-bold text-navy-950",
                            )}
                          >
                            {row.contact}
                            {!row.isRead ? <span className="sr-only"> (unread)</span> : null}
                          </span>
                          {row.contactDetail ? (
                            <span className="admin-break block text-xs text-slate-500">{row.contactDetail}</span>
                          ) : null}
                        </span>
                      </Link>
                    </TD>
                    <TD className="max-w-[380px]">
                      <Link href={href} prefetch={false} className="block hover:text-navy-800" tabIndex={-1}>
                        <span className="flex items-center gap-1.5">
                          {row.direction === "outbound" ? (
                            <ArrowUpRight className="size-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                          ) : (
                            <ArrowDownLeft className="size-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                          )}
                          <span className="sr-only">{row.direction === "outbound" ? "Outgoing:" : "Incoming:"}</span>
                          <span
                            className={cn("truncate", row.isRead ? "text-slate-700" : "font-semibold text-navy-950")}
                          >
                            {row.subject || row.snippet || "(no text)"}
                          </span>
                        </span>
                        {row.subject && row.snippet ? (
                          <span className="mt-0.5 line-clamp-1 text-xs text-slate-500">{row.snippet}</span>
                        ) : null}
                        {row.source === "manual" ? (
                          <span className="mt-0.5 block text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                            Logged manually
                          </span>
                        ) : null}
                      </Link>
                    </TD>
                    <TD className="max-w-[180px]">
                      {row.productName ? (
                        <span className="line-clamp-2 text-sm text-slate-700">{row.productName}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TD>
                    <TD className="whitespace-nowrap">
                      <time dateTime={row.timeIso} title={row.timeTitle} className="text-sm text-slate-600">
                        {row.timeLabel}
                      </time>
                    </TD>
                    <TD>
                      <MessageStatusBadge status={row.status} />
                    </TD>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </>
      )}

      {canDelete ? (
        <dialog
          ref={deleteDialog}
          aria-labelledby="inbox-delete-title"
          className="m-auto w-[min(440px,calc(100vw-2rem))] rounded-2xl border border-slate-200 p-0 shadow-2xl backdrop:bg-navy-950/45 backdrop:backdrop-blur-[2px]"
          onClick={(event) => {
            if (event.target === deleteDialog.current) deleteDialog.current?.close();
          }}
        >
          <form action={formAction} className="flex flex-col gap-4 p-6">
            <input type="hidden" name="ids" value={toDelete.join(",")} />
            <input type="hidden" name="op" value="delete" />
            <div>
              <h2 id="inbox-delete-title" className="font-display text-lg font-bold text-navy-950">
                Delete {toDelete.length} {toDelete.length === 1 ? "message" : "messages"}?
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                The messages and their internal notes will be removed permanently. This can’t be undone.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className={adminButton({ variant: "secondary" })}
                onClick={() => deleteDialog.current?.close()}
              >
                Cancel
              </button>
              <SubmitButton variant="danger" pendingLabel="Deleting…">
                Delete permanently
              </SubmitButton>
            </div>
          </form>
        </dialog>
      ) : null}
    </>
  );
}
