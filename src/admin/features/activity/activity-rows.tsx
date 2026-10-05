"use client";

import { ChevronRight } from "lucide-react";
import { useState, type MouseEvent } from "react";

import { Badge, TD, type BadgeTone } from "@/admin/components/ui/primitives";
import { cn } from "@/lib/cn";

import type { FormattedChange, FormattedValue } from "./format";

/** One audit-trail entry, pre-formatted on the server (plain, serialisable data). */
export interface ActivityRowView {
  id: string;
  iso: string;
  time: string;
  /** Exact time with seconds, for the details row. */
  exactTime: string;
  relative: string;
  actorName: string;
  actorEmail: string;
  action: string;
  tone: BadgeTone;
  entityLabel: string;
  entityId: string;
  summary: string;
  ip: string;
  changes: FormattedChange[];
}

export const ACTIVITY_COLUMNS = 6;

/** Table rows that expand to show who changed which field from what to what. */
export function ActivityRows({ rows }: { rows: ActivityRowView[] }) {
  return rows.map((row) => <ActivityRow key={row.id} row={row} />);
}

function ActivityRow({ row }: { row: ActivityRowView }) {
  const [open, setOpen] = useState(false);
  const detailId = `activity-detail-${row.id}`;

  // The whole row toggles, except when the click was on a control or ended a text selection.
  const onRowClick = (event: MouseEvent<HTMLTableRowElement>) => {
    if ((event.target as HTMLElement).closest("a, button, input, select, textarea")) return;
    if (window.getSelection()?.toString()) return;
    setOpen((value) => !value);
  };

  return (
    <>
      <tr
        onClick={onRowClick}
        className={cn("cursor-pointer transition-colors hover:bg-slate-50/80", open && "bg-slate-50/80")}
      >
        <TD className="w-10 pr-0">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={detailId}
            aria-label={`${open ? "Hide" : "Show"} details: ${row.summary}`}
            onClick={() => setOpen((value) => !value)}
            className="flex size-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-200/60 hover:text-navy-900 focus-visible:outline-2 focus-visible:outline-brand-500"
          >
            <ChevronRight
              aria-hidden="true"
              className={cn("size-4 transition-transform duration-150", open && "rotate-90")}
            />
          </button>
        </TD>
        <TD className="whitespace-nowrap">
          <time dateTime={row.iso} className="block text-slate-800">
            {row.time}
          </time>
          <span className="block text-xs text-slate-500">{row.relative}</span>
        </TD>
        <TD>
          <span className="block max-w-52 truncate font-medium text-slate-800" title={row.actorName}>
            {row.actorName}
          </span>
          {row.actorEmail ? (
            <span className="block max-w-52 truncate text-xs text-slate-500" title={row.actorEmail}>
              {row.actorEmail}
            </span>
          ) : null}
        </TD>
        <TD>
          <Badge tone={row.tone} className="font-mono text-[11px] tracking-tight">
            {row.action}
          </Badge>
        </TD>
        <TD>
          <span className="block whitespace-nowrap text-slate-700">{row.entityLabel}</span>
          {row.entityId ? (
            <span className="block font-mono text-[11px] text-slate-400" title={row.entityId}>
              {row.entityId.length > 13 ? `${row.entityId.slice(0, 8)}…` : row.entityId}
            </span>
          ) : null}
        </TD>
        <TD className="min-w-64">
          <span className="text-slate-800">{row.summary}</span>
          {row.changes.length > 0 ? (
            <span className="ml-2 inline-flex rounded-full bg-brand-500/10 px-1.5 py-0.5 align-middle text-[11px] font-semibold whitespace-nowrap text-brand-600">
              {row.changes.length} {row.changes.length === 1 ? "field" : "fields"}
            </span>
          ) : null}
        </TD>
      </tr>
      <tr id={detailId} hidden={!open}>
        <td colSpan={ACTIVITY_COLUMNS} className="border-b border-slate-100 bg-slate-50/80 px-4 pt-1 pb-4 sm:pl-14">
          {row.changes.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <table className="w-full table-fixed border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                    <th scope="col" className="w-36 px-3 py-2 sm:w-44">
                      Field
                    </th>
                    <th scope="col" className="px-3 py-2">
                      Before
                    </th>
                    <th scope="col" className="px-3 py-2">
                      After
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {row.changes.map((change) => (
                    <tr key={change.field} className="border-t border-slate-100 align-top">
                      <th
                        scope="row"
                        className="px-3 py-2 font-semibold break-words text-slate-700"
                        title={change.field}
                      >
                        {change.label}
                      </th>
                      <td className="px-3 py-2">
                        <ChangeValue value={change.from} kind="from" />
                      </td>
                      <td className="px-3 py-2">
                        <ChangeValue value={change.to} kind="to" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No field-level changes were recorded for this entry.</p>
          )}
          <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
            <div>
              <dt className="inline font-semibold text-slate-600">Logged: </dt>
              <dd className="inline">
                <time dateTime={row.iso}>{row.exactTime}</time>
              </dd>
            </div>
            {row.entityId ? (
              <div>
                <dt className="inline font-semibold text-slate-600">Entity ID: </dt>
                <dd className="admin-break inline font-mono">{row.entityId}</dd>
              </div>
            ) : null}
            <div>
              <dt className="inline font-semibold text-slate-600">IP address: </dt>
              <dd className="inline font-mono">{row.ip || "—"}</dd>
            </div>
          </dl>
        </td>
      </tr>
    </>
  );
}

function ChangeValue({ value, kind }: { value: FormattedValue; kind: "from" | "to" }) {
  if (value.empty) return <span className="text-slate-400 italic">{value.text}</span>;
  return (
    <>
      <pre
        className={cn(
          "max-h-60 overflow-auto rounded-md px-2.5 py-1.5 font-mono text-xs leading-relaxed break-words whitespace-pre-wrap",
          kind === "from" ? "bg-red-50 text-red-900" : "bg-leaf-600/10 text-slate-900",
        )}
      >
        {value.text}
      </pre>
      {value.truncated ? (
        <span className="mt-1 block text-[11px] text-slate-400">
          Shortened here — the CSV export has the full value.
        </span>
      ) : null}
    </>
  );
}
