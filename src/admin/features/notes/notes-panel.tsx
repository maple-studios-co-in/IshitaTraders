"use client";

import { StickyNote, Trash2 } from "lucide-react";
import { useRef } from "react";

import { ConfirmAction } from "@/admin/components/ui/confirm-action";
import { Textarea } from "@/admin/components/ui/form-controls";
import { Card, CardHeader } from "@/admin/components/ui/primitives";
import { SubmitButton } from "@/admin/components/ui/submit-button";
import { useFormAction } from "@/admin/components/ui/use-form-action";
import { formatDateTime } from "@/admin/lib/format";

import { addNote, deleteNote } from "./actions";

interface NoteView {
  id: string;
  body: string;
  authorName: string;
  createdAt: string;
}

/** Internal notes thread for an enquiry or message (never shown to customers). */
export function NotesPanel({
  entityType,
  entityId,
  notes,
  canWrite,
}: {
  entityType: "enquiry" | "message";
  entityId: string;
  notes: NoteView[];
  canWrite: boolean;
}) {
  const form = useRef<HTMLFormElement>(null);
  const { pending, onSubmit } = useFormAction(addNote, { onSuccess: () => form.current?.reset() });

  return (
    <Card>
      <CardHeader title="Internal notes" description="Visible to your team only." />
      <div className="flex flex-col gap-4 p-5">
        {notes.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <StickyNote className="size-4" aria-hidden="true" /> No notes yet.
          </p>
        ) : (
          <ol className="flex flex-col gap-3">
            {notes.map((note) => (
              <li key={note.id} className="rounded-lg border border-amber-200/70 bg-amber-50/60 px-3.5 py-2.5">
                <p className="text-sm whitespace-pre-line text-slate-800">{note.body}</p>
                <div className="mt-1.5 flex items-center justify-between gap-2 text-xs text-slate-500">
                  <span>
                    {note.authorName || "Someone"} · {formatDateTime(note.createdAt)}
                  </span>
                  {canWrite ? (
                    <ConfirmAction
                      action={deleteNote}
                      fields={{ id: note.id, entityType }}
                      title="Delete this note?"
                      description="The note will be removed permanently."
                      confirmLabel="Delete note"
                      size="icon-sm"
                      ariaLabel="Delete note"
                    >
                      <Trash2 />
                    </ConfirmAction>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        )}
        {canWrite ? (
          <form ref={form} onSubmit={onSubmit} className="flex flex-col gap-2">
            <input type="hidden" name="entityType" value={entityType} />
            <input type="hidden" name="entityId" value={entityId} />
            <label htmlFor={`note-${entityId}`} className="sr-only">
              New note
            </label>
            <Textarea
              id={`note-${entityId}`}
              name="body"
              rows={3}
              placeholder="Called back, sent quotation, site visit on Friday…"
              required
            />
            <div className="flex justify-end">
              <SubmitButton pending={pending} size="sm" pendingLabel="Saving…">
                Add note
              </SubmitButton>
            </div>
          </form>
        ) : null}
      </div>
    </Card>
  );
}
