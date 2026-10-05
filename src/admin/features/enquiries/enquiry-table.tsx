import { Mail, MessageCircle, Package, Phone } from "lucide-react";
import Link from "next/link";

import { adminButton } from "@/admin/components/ui/button";
import { Badge, Table, TD, TH } from "@/admin/components/ui/primitives";
import { enquiryStatusLabels } from "@/admin/content/types";
import { formatDateTime, formatPhone, timeAgo, whatsappDigits } from "@/admin/lib/format";
import { cn } from "@/lib/cn";

import { ENQUIRY_BULK_FORM, EnquiriesSelectAll } from "./enquiry-controls";
import { enquiryStatusTone } from "./presentation";
import type { EnquiryRow } from "./queries";

/** The client's details for each enquiry, newest first. Unread rows are marked. */
export function EnquiryTable({ rows, selectable }: { rows: EnquiryRow[]; selectable: boolean }) {
  return (
    <Table>
      <thead>
        <tr>
          {selectable ? (
            <TH className="w-10">
              <EnquiriesSelectAll />
            </TH>
          ) : null}
          <TH>Client</TH>
          <TH>Contact</TH>
          <TH>Enquiry</TH>
          <TH>Status</TH>
          <TH>Received</TH>
          <TH align="right">
            <span className="sr-only">Reply</span>
          </TH>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const digits = row.phone ? whatsappDigits(row.phone) : "";
          const quantity = row.fields.find((field) => field.key === "quantity")?.value;
          return (
            <tr key={row.id} className={cn("group hover:bg-slate-50/70", !row.isRead && "bg-brand-500/[0.035]")}>
              {selectable ? (
                <TD>
                  <input
                    type="checkbox"
                    name="ids"
                    value={row.id}
                    form={ENQUIRY_BULK_FORM}
                    aria-label={`Select enquiry from ${row.name || "visitor"}`}
                    className="size-4 rounded border-slate-300 accent-navy-800"
                  />
                </TD>
              ) : null}
              <TD>
                <Link href={`/admin/enquiries/${row.id}`} className="flex items-start gap-2">
                  <span
                    className={cn(
                      "mt-1.5 size-2 shrink-0 rounded-full",
                      row.isRead ? "bg-transparent" : "bg-brand-500",
                    )}
                    aria-label={row.isRead ? undefined : "Unread"}
                  />
                  <span className="min-w-0">
                    <span
                      className={cn(
                        "block max-w-[220px] truncate text-navy-950 group-hover:text-brand-600 group-hover:underline",
                        !row.isRead ? "font-bold" : "font-semibold",
                      )}
                    >
                      {row.name || "No name"}
                    </span>
                    {row.company ? (
                      <span className="block max-w-[220px] truncate text-xs text-slate-500">{row.company}</span>
                    ) : null}
                  </span>
                </Link>
              </TD>
              <TD className="text-xs">
                {row.phone ? (
                  <p className="font-medium whitespace-nowrap text-slate-700">{formatPhone(row.phone)}</p>
                ) : null}
                {row.email ? <p className="admin-break max-w-[220px] text-slate-500">{row.email}</p> : null}
                {!row.phone && !row.email ? <span className="text-slate-400">—</span> : null}
              </TD>
              <TD>
                {row.productName ? (
                  <p className="mb-0.5 flex max-w-[300px] items-center gap-1 truncate text-xs font-semibold text-navy-800">
                    <Package className="size-3.5 shrink-0" aria-hidden="true" /> {row.productName}
                    {quantity ? <span className="font-normal text-slate-500">· {quantity} units</span> : null}
                  </p>
                ) : null}
                <p className="line-clamp-2 max-w-[340px] text-xs text-slate-600">
                  {row.message || <span className="text-slate-400">No message</span>}
                </p>
              </TD>
              <TD>
                <Badge tone={enquiryStatusTone[row.status]}>{enquiryStatusLabels[row.status]}</Badge>
                {row.followUpAt ? (
                  <p
                    className={cn(
                      "mt-1 text-[11px] whitespace-nowrap",
                      row.followUpAt < new Date() ? "font-semibold text-red-600" : "text-slate-500",
                    )}
                  >
                    Follow up {timeAgo(row.followUpAt)}
                  </p>
                ) : null}
              </TD>
              <TD className="text-xs whitespace-nowrap text-slate-500">
                <time dateTime={row.createdAt.toISOString()} title={formatDateTime(row.createdAt)}>
                  {timeAgo(row.createdAt)}
                </time>
              </TD>
              <TD align="right">
                <div className="flex justify-end gap-0.5">
                  {digits ? (
                    <>
                      <a
                        href={`https://wa.me/${digits}?text=${encodeURIComponent(`Hello ${row.name.split(" ")[0] || ""}, this is Ishita Traders replying to your enquiry${row.productName ? ` about ${row.productName}` : ""}.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={adminButton({ variant: "ghost", size: "icon-sm", className: "text-leaf-700" })}
                        aria-label={`WhatsApp ${row.name}`}
                        title="Reply on WhatsApp"
                      >
                        <MessageCircle />
                      </a>
                      <a
                        href={`tel:+${digits}`}
                        className={adminButton({ variant: "ghost", size: "icon-sm" })}
                        aria-label={`Call ${row.name}`}
                        title="Call"
                      >
                        <Phone />
                      </a>
                    </>
                  ) : null}
                  {row.email ? (
                    <a
                      href={`mailto:${row.email}?subject=${encodeURIComponent(`Re: your enquiry — Ishita Traders`)}`}
                      className={adminButton({ variant: "ghost", size: "icon-sm" })}
                      aria-label={`Email ${row.name}`}
                      title="Email"
                    >
                      <Mail />
                    </a>
                  ) : null}
                </div>
              </TD>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}
