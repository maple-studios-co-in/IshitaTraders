import { ChevronLeft, ChevronRight, Package } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { adminButton } from "@/admin/components/ui/button";
import { ContactActions } from "@/admin/components/ui/contact-actions";
import { Callout, Card, CardHeader, DetailList, PageHeader } from "@/admin/components/ui/primitives";
import { can } from "@/admin/config/permissions";
import { messageChannelLabels } from "@/admin/content/types";
import {
  AssignButton,
  DeleteMessageButton,
  MarkUnreadButton,
  MessageStatusForm,
} from "@/admin/features/inbox/message-controls";
import { ChannelIcon, contactTitle, MessageStatusBadge } from "@/admin/features/inbox/presentation";
import { getMessage, getMessageNeighbours, markMessageRead } from "@/admin/features/inbox/queries";
import { NotesPanel } from "@/admin/features/notes/notes-panel";
import { listNotes } from "@/admin/features/notes/queries";
import { formatDateTime, formatPhone, timeAgo } from "@/admin/lib/format";
import { requirePermission } from "@/admin/server/auth/guard";

export const metadata: Metadata = { title: "Message" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const metaText = (meta: Record<string, unknown>, key: string) =>
  typeof meta[key] === "string" ? (meta[key] as string) : "";

export default async function MessagePage({ params }: PageProps<"/admin/inbox/[id]">) {
  const user = await requirePermission("inbox:read");
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const row = await getMessage(id);
  if (!row) notFound();

  const canWrite = can(user.role, "inbox:write");
  let message = row.message;
  // Opening a message marks it read for the team (read-only roles don't change anything).
  if (!message.isRead && canWrite) {
    await markMessageRead(id);
    message = { ...message, isRead: true };
  }
  const [notes, neighbours] = await Promise.all([listNotes("message", id), getMessageNeighbours(message)]);

  const title = contactTitle(message);
  const channel = messageChannelLabels[message.channel];
  const meta = message.meta ?? {};
  const isMedia = Boolean(metaText(meta, "mediaId"));
  const subjectFallback = message.channel === "call" ? "Phone call" : `${channel} message`;

  return (
    <>
      <PageHeader
        title={title}
        description={
          <>
            {channel} · {message.direction === "outbound" ? "we contacted them" : "they contacted us"} ·{" "}
            {formatDateTime(message.occurredAt)} ({timeAgo(message.occurredAt)})
          </>
        }
        breadcrumbs={[{ label: "Leads" }, { label: "Inbox", href: "/admin/inbox" }, { label: title }]}
        actions={
          <nav aria-label="Other messages" className="flex items-center gap-1.5">
            {neighbours.newer ? (
              <Link
                href={`/admin/inbox/${neighbours.newer}`}
                prefetch={false}
                className={adminButton({ variant: "secondary", size: "sm" })}
              >
                <ChevronLeft aria-hidden="true" /> Newer
              </Link>
            ) : null}
            {neighbours.older ? (
              <Link
                href={`/admin/inbox/${neighbours.older}`}
                prefetch={false}
                className={adminButton({ variant: "secondary", size: "sm" })}
              >
                Older <ChevronRight aria-hidden="true" />
              </Link>
            ) : null}
          </nav>
        }
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader
              title={
                <span className="flex items-center gap-3">
                  <ChannelIcon channel={message.channel} />
                  <span className="admin-break">{message.subject || subjectFallback}</span>
                </span>
              }
              description={
                message.source === "manual"
                  ? `Logged manually${metaText(meta, "loggedBy") ? ` by ${metaText(meta, "loggedBy")}` : ""}`
                  : `Received via the ${channel} webhook`
              }
              actions={<MessageStatusBadge status={message.status} />}
            />
            <div className="p-5">
              {message.body ? (
                <p className="admin-break text-[15px] leading-relaxed whitespace-pre-wrap text-slate-800">
                  {message.body}
                </p>
              ) : (
                <p className="text-sm text-slate-400">(no text)</p>
              )}
              {isMedia ? (
                <Callout tone="info" className="mt-4" title="Media stays in WhatsApp">
                  Photos, documents and voice notes aren’t copied to the website. Open the chat in WhatsApp to view the
                  file
                  {metaText(meta, "filename") ? ` (${metaText(meta, "filename")})` : ""}.
                </Callout>
              ) : null}
            </div>
            {Object.keys(meta).length > 0 ? (
              <details className="group border-t border-slate-100">
                <summary className="cursor-pointer px-5 py-3 text-sm font-semibold text-slate-600 hover:text-navy-900">
                  Technical details (raw data)
                </summary>
                <pre className="mx-5 mb-5 max-h-96 overflow-auto rounded-lg bg-slate-950 p-4 text-xs leading-relaxed text-slate-100">
                  {JSON.stringify(meta, null, 2)}
                </pre>
              </details>
            ) : null}
          </Card>

          <NotesPanel
            entityType="message"
            entityId={message.id}
            canWrite={canWrite}
            notes={notes.map((note) => ({
              id: note.id,
              body: note.body,
              authorName: note.authorName,
              createdAt: note.createdAt.toISOString(),
            }))}
          />
        </div>

        <div className="flex flex-col gap-6 xl:sticky xl:top-24">
          <Card>
            <CardHeader title="Contact" />
            <div className="flex flex-col gap-4 p-5">
              <DetailList
                className="sm:grid-cols-1"
                items={[
                  { label: "Name", value: message.contactName },
                  { label: "Phone", value: message.contactPhone ? formatPhone(message.contactPhone) : "" },
                  {
                    label: "Email",
                    value: message.contactEmail ? <span className="admin-break">{message.contactEmail}</span> : "",
                  },
                ]}
              />
              <ContactActions
                phone={message.contactPhone || undefined}
                email={message.contactEmail || undefined}
                name={message.contactName || undefined}
                emailSubject={message.subject ? `Re: ${message.subject}` : undefined}
              />
            </div>
          </Card>

          <Card>
            <CardHeader title="Handling" />
            <div className="flex flex-col gap-4 p-5">
              {canWrite ? <MessageStatusForm id={message.id} status={message.status} /> : null}
              <DetailList
                className="sm:grid-cols-1"
                items={[
                  { label: "Assigned to", value: row.assigneeName ?? "Nobody yet" },
                  { label: "Recorded", value: formatDateTime(message.createdAt) },
                  ...(message.externalId
                    ? [
                        {
                          label: "Provider id",
                          value: <span className="admin-break font-mono text-xs">{message.externalId}</span>,
                        },
                      ]
                    : []),
                ]}
              />
              {canWrite ? (
                <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                  <AssignButton id={message.id} assignedToMe={message.assignedTo === user.id} />
                  <MarkUnreadButton id={message.id} />
                  {can(user.role, "enquiries:delete") ? <DeleteMessageButton id={message.id} label={title} /> : null}
                </div>
              ) : null}
            </div>
          </Card>

          {message.productId && row.productName ? (
            <Card>
              <CardHeader title="Product" />
              <div className="p-5">
                <Link
                  href={`/admin/products/${message.productId}`}
                  className="flex items-center gap-3 text-sm font-semibold text-navy-900 hover:underline"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface text-navy-800">
                    <Package className="size-4" aria-hidden="true" />
                  </span>
                  <span className="admin-break">{row.productName}</span>
                </Link>
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
