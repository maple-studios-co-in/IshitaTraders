import { ChevronLeft, ChevronRight, ExternalLink, MailOpen, MapPin, Package, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ActionButton } from "@/admin/components/ui/action-button";
import { adminButton } from "@/admin/components/ui/button";
import { ConfirmAction } from "@/admin/components/ui/confirm-action";
import { ContactActions } from "@/admin/components/ui/contact-actions";
import { Badge, Card, CardHeader, DetailList, PageHeader } from "@/admin/components/ui/primitives";
import { can } from "@/admin/config/permissions";
import { enquiryStatusLabels } from "@/admin/content/types";
import { deleteEnquiry, setEnquiryRead } from "@/admin/features/enquiries/actions";
import { EnquiryStatusForm, MarkEnquiryRead } from "@/admin/features/enquiries/enquiry-controls";
import { describeDevice, enquiryStatusTone, formInfo } from "@/admin/features/enquiries/presentation";
import { enquiryNeighbours, getEnquiry, listAssignees, relatedEnquiries } from "@/admin/features/enquiries/queries";
import { NotesPanel } from "@/admin/features/notes/notes-panel";
import { listNotes } from "@/admin/features/notes/queries";
import { formatDateTime, formatPhone, timeAgo } from "@/admin/lib/format";
import { requirePermission } from "@/admin/server/auth/guard";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const row = await getEnquiry((await params).id);
  return { title: row ? `Enquiry · ${row.name || "Visitor"}` : "Enquiry not found" };
}

export default async function EnquiryPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("enquiries:read");
  const row = await getEnquiry((await params).id);
  if (!row) notFound();

  const [neighbours, related, assignees, notes] = await Promise.all([
    enquiryNeighbours(row),
    relatedEnquiries(row),
    listAssignees(),
    listNotes("enquiry", row.id),
  ]);
  const form = formInfo(row.formKey, row.formName);
  const canWrite = can(user.role, "enquiries:write");
  const utm = Object.entries(row.utm).filter(([, value]) => value);
  const fields = row.fields.length
    ? row.fields
    : [
        { key: "name", label: "Name", value: row.name },
        { key: "email", label: "Email", value: row.email },
        { key: "phone", label: "Phone", value: row.phone },
        { key: "message", label: "Message", value: row.message },
      ];

  return (
    <>
      <MarkEnquiryRead id={row.id} isRead={row.isRead} />
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {row.name || "Visitor"}
            <Badge tone={enquiryStatusTone[row.status]}>{enquiryStatusLabels[row.status]}</Badge>
          </span>
        }
        description={
          <>
            <strong className="font-semibold text-slate-700">{form.name}</strong> · received{" "}
            {formatDateTime(row.createdAt)} ({timeAgo(row.createdAt)})
          </>
        }
        breadcrumbs={[
          { label: "Leads" },
          { label: "Enquiries", href: "/admin/enquiries" },
          { label: form.name, href: `/admin/enquiries?form=${row.formKey}` },
          { label: row.name || "Visitor" },
        ]}
        actions={
          <div className="flex items-center gap-1">
            {neighbours.newer ? (
              <Link
                href={`/admin/enquiries/${neighbours.newer}`}
                className={adminButton({ variant: "secondary", size: "sm" })}
                title="Newer enquiry from this form"
              >
                <ChevronLeft aria-hidden="true" /> Newer
              </Link>
            ) : null}
            {neighbours.older ? (
              <Link
                href={`/admin/enquiries/${neighbours.older}`}
                className={adminButton({ variant: "secondary", size: "sm" })}
                title="Older enquiry from this form"
              >
                Older <ChevronRight aria-hidden="true" />
              </Link>
            ) : null}
          </div>
        }
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader
              title="What the client submitted"
              description={
                <span className="flex items-center gap-1">
                  <MapPin className="size-3.5" aria-hidden="true" /> {form.location}
                </span>
              }
              actions={
                <ContactActions
                  phone={row.phone}
                  email={row.email}
                  name={row.name}
                  whatsappMessage={`Hello ${row.name.split(" ")[0] || ""}, this is Ishita Traders replying to your ${row.productName ? `enquiry about ${row.productName}` : "enquiry"}.`}
                />
              }
            />
            <div className="p-5">
              <DetailList
                items={fields.map((field) => ({
                  label: field.label,
                  value:
                    field.key === "phone" && field.value ? (
                      <a href={`tel:${field.value}`} className="font-medium text-navy-900 hover:underline">
                        {formatPhone(field.value)}
                      </a>
                    ) : field.key === "email" && field.value ? (
                      <a
                        href={`mailto:${field.value}`}
                        className="admin-break font-medium text-navy-900 hover:underline"
                      >
                        {field.value}
                      </a>
                    ) : (
                      field.value
                    ),
                }))}
              />
            </div>
          </Card>

          {row.productName ? (
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <p className="flex items-center gap-2 text-sm">
                  <Package className="size-4 text-navy-800" aria-hidden="true" />
                  <span className="text-slate-500">Product:</span>{" "}
                  <strong className="font-semibold text-navy-950">{row.productName}</strong>
                </p>
                {row.productId ? (
                  <Link
                    href={`/admin/products/${row.productId}`}
                    className={adminButton({ variant: "secondary", size: "sm" })}
                  >
                    Open product
                  </Link>
                ) : null}
              </div>
            </Card>
          ) : null}

          <NotesPanel
            entityType="enquiry"
            entityId={row.id}
            canWrite={canWrite}
            notes={notes.map((note) => ({
              id: note.id,
              body: note.body,
              authorName: note.authorName,
              createdAt: note.createdAt.toISOString(),
            }))}
          />

          {related.length ? (
            <Card>
              <CardHeader title="Earlier enquiries from this client" description="Matched by phone number or email." />
              <ul className="divide-y divide-slate-100">
                {related.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/admin/enquiries/${item.id}`}
                      className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-slate-50"
                    >
                      <span className="min-w-0 truncate">
                        <span className="font-medium text-slate-800">{item.formName}</span>
                        {item.productName ? <span className="text-slate-500"> · {item.productName}</span> : null}
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <Badge tone={enquiryStatusTone[item.status]}>{enquiryStatusLabels[item.status]}</Badge>
                        <span className="text-xs text-slate-500">{timeAgo(item.createdAt)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>

        <aside className="flex flex-col gap-6 xl:sticky xl:top-24">
          <Card>
            <CardHeader title="Follow-up" />
            <div className="p-5">
              {canWrite ? (
                <EnquiryStatusForm
                  id={row.id}
                  status={row.status}
                  assignedTo={row.assignedTo}
                  followUpAt={row.followUpAt?.toISOString() ?? null}
                  assignees={assignees}
                />
              ) : (
                <p className="text-sm text-slate-600">
                  Status: <strong>{enquiryStatusLabels[row.status]}</strong>
                </p>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Where it came from" />
            <div className="p-5">
              <DetailList
                className="sm:grid-cols-1"
                items={[
                  {
                    label: "Page",
                    value: row.pageUrl ? (
                      <a
                        href={row.pageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="admin-break inline-flex items-center gap-1 text-navy-900 hover:underline"
                      >
                        {row.pageUrl.replace(/^https?:\/\/[^/]+/, "") || "/"}{" "}
                        <ExternalLink className="size-3" aria-hidden="true" />
                      </a>
                    ) : (
                      ""
                    ),
                  },
                  {
                    label: "Came from",
                    value: row.referrer ? <span className="admin-break">{row.referrer}</span> : "Direct / unknown",
                  },
                  {
                    label: "Campaign (UTM)",
                    value: utm.length ? utm.map(([key, value]) => `${key}: ${value}`).join(" · ") : "",
                  },
                  { label: "Device", value: describeDevice(row.userAgent) },
                ]}
              />
            </div>
          </Card>

          {canWrite ? (
            <div className="flex flex-wrap gap-2">
              <ActionButton action={setEnquiryRead} fields={{ id: row.id, read: "0" }} variant="ghost">
                <MailOpen aria-hidden="true" /> Mark unread
              </ActionButton>
              {can(user.role, "enquiries:delete") ? (
                <ConfirmAction
                  action={deleteEnquiry}
                  fields={{ id: row.id }}
                  title="Delete this enquiry?"
                  description="The enquiry and its notes will be permanently deleted. To keep it out of the way instead, set its status to Spam or Lost."
                  confirmLabel="Delete enquiry"
                  size="md"
                >
                  <Trash2 aria-hidden="true" /> Delete
                </ConfirmAction>
              ) : null}
            </div>
          ) : null}
        </aside>
      </div>
    </>
  );
}
