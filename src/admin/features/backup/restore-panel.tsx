"use client";

import { LoaderCircle, RotateCcw } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/admin/components/ui/button";
import { Field, Input } from "@/admin/components/ui/form-controls";
import { Callout } from "@/admin/components/ui/primitives";
import { toast } from "@/admin/components/ui/toaster";
import { idleState } from "@/admin/lib/action-state";
import { formatBytes, formatDateTime } from "@/admin/lib/format";
import { cn } from "@/lib/cn";

import { previewRestore, restoreBackup } from "./actions";
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  backupTableInfo,
  contentTables,
  MAX_RESTORE_UPLOAD_BYTES,
  recordTables,
  RESTORE_CONFIRM_WORD,
  type RestorePlan,
} from "./format";

interface PreparedUpload {
  fileName: string;
  /** The content tables only, gzipped (fits the Server Action body limit). */
  payload: Blob;
  skipped: { label: string; rows: number }[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

async function gzip(text: string): Promise<Blob> {
  if (typeof CompressionStream === "undefined") return new Blob([text], { type: "application/json" });
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"));
  return new Response(stream).blob();
}

/** Reads the chosen file in the browser and keeps only what a restore uses. The server re-validates everything. */
async function prepareUpload(file: File): Promise<PreparedUpload> {
  if (file.size > 300 * 1024 * 1024) throw new Error("That file is too large to be a backup from this admin.");
  let data: unknown;
  try {
    data = JSON.parse(await file.text());
  } catch {
    throw new Error("That file isn’t valid JSON. Choose the .json file you downloaded from this page.");
  }
  if (!isRecord(data) || data.format !== BACKUP_FORMAT) throw new Error("This file isn’t an Ishita Traders backup.");
  if (data.version !== BACKUP_VERSION) {
    throw new Error(
      `This backup uses format version ${String(data.version)}; this admin can only restore version ${BACKUP_VERSION}.`,
    );
  }
  const tables = isRecord(data.tables) ? data.tables : {};
  const content = Object.fromEntries(contentTables.map((name) => [name, tables[name]]));
  const skipped = recordTables
    .map((name) => {
      const rows = tables[name];
      return { label: backupTableInfo[name].label, rows: Array.isArray(rows) ? rows.length : 0 };
    })
    .filter((entry) => entry.rows > 0);

  const payload = await gzip(
    JSON.stringify({ format: data.format, version: data.version, exportedAt: data.exportedAt, tables: content }),
  );
  if (payload.size > MAX_RESTORE_UPLOAD_BYTES) {
    throw new Error(
      `The website content in this backup is too large to restore from the browser (${formatBytes(payload.size)} compressed; the limit is ${formatBytes(MAX_RESTORE_UPLOAD_BYTES)}).`,
    );
  }
  return { fileName: file.name, payload, skipped };
}

function uploadData(payload: Blob) {
  const formData = new FormData();
  formData.append("backup", payload, "backup.json.gz");
  return formData;
}

type Busy = "reading" | "checking" | "restoring" | null;

/** Owner-only: choose a backup → server-checked preview of what changes → type RESTORE → restore. */
export function RestorePanel() {
  const input = useRef<HTMLInputElement>(null);
  const request = useRef(0);
  const [prepared, setPrepared] = useState<PreparedUpload | null>(null);
  const [plan, setPlan] = useState<RestorePlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [confirm, setConfirm] = useState("");

  function clear() {
    request.current++;
    setPrepared(null);
    setPlan(null);
    setError(null);
    setConfirm("");
    setBusy(null);
    if (input.current) input.current.value = "";
  }

  async function choose(file: File | undefined) {
    const id = ++request.current;
    setPrepared(null);
    setPlan(null);
    setError(null);
    setConfirm("");
    if (!file) return;
    setBusy("reading");
    try {
      const upload = await prepareUpload(file);
      if (id !== request.current) return;
      setPrepared(upload);
      setBusy("checking");
      const result = await previewRestore(idleState, uploadData(upload.payload));
      if (id !== request.current) return;
      if (result.status === "success" && isRecord(result.data) && isRecord(result.data.plan)) {
        setPlan(result.data.plan as unknown as RestorePlan);
      } else if (result.status === "error") {
        setError(result.message);
      }
    } catch (problem) {
      if (id === request.current) setError(problem instanceof Error ? problem.message : "That file couldn’t be read.");
    } finally {
      if (id === request.current) setBusy(null);
    }
  }

  async function restore() {
    if (!prepared || !plan || confirm !== RESTORE_CONFIRM_WORD) return;
    const id = ++request.current;
    setBusy("restoring");
    setError(null);
    try {
      const formData = uploadData(prepared.payload);
      formData.set("confirm", confirm);
      const result = await restoreBackup(idleState, formData);
      if (id !== request.current) return;
      if (result.status === "success") {
        toast.success(result.message);
        clear();
      } else if (result.status === "error") {
        setError(result.message);
        toast.error(result.message);
      }
    } catch {
      if (id === request.current) {
        setError(
          "We couldn’t reach the server. Reload the page to check whether the restore went through before trying again.",
        );
      }
    } finally {
      if (id === request.current) setBusy(null);
    }
  }

  const checking = busy === "reading" || busy === "checking";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="restore-file" className="text-sm font-semibold text-slate-800">
          Backup file
        </label>
        <input
          ref={input}
          id="restore-file"
          type="file"
          accept=".json,application/json"
          disabled={busy === "restoring"}
          onChange={(event) => void choose(event.target.files?.[0])}
          className={cn(
            "block w-full text-sm text-slate-600",
            "file:mr-3 file:cursor-pointer file:rounded-lg file:border file:border-slate-300 file:bg-white file:px-3 file:py-2 file:text-sm file:font-semibold file:text-navy-900 hover:file:border-navy-800",
          )}
        />
        <p className="text-xs text-slate-500">
          A .json file downloaded from this page. It’s checked before anything changes.
        </p>
      </div>

      {checking ? (
        <p className="flex items-center gap-2 text-sm text-slate-600" role="status">
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          {busy === "reading" ? "Reading the file…" : "Checking the backup…"}
        </p>
      ) : null}

      {error ? (
        <Callout tone="danger" title="Can’t restore this backup">
          {error}
        </Callout>
      ) : null}

      {plan && prepared ? (
        <div className="flex flex-col gap-4" data-restore-preview>
          <div className="rounded-lg border border-slate-200">
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-semibold text-slate-800">Backup taken {formatDateTime(plan.exportedAt)}</p>
              <p className="truncate text-xs text-slate-500">{prepared.fileName}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                    <th scope="col" className="px-4 py-2">
                      Content
                    </th>
                    <th scope="col" className="px-3 py-2 text-right">
                      In backup
                    </th>
                    <th scope="col" className="px-3 py-2 text-right">
                      Overwrite
                    </th>
                    <th scope="col" className="px-3 py-2 text-right">
                      Add back
                    </th>
                    <th scope="col" className="px-3 py-2 text-right">
                      Replace
                    </th>
                    <th scope="col" className="px-4 py-2 text-right">
                      Keep as is
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {plan.tables.map((table) => (
                    <tr key={table.table} className="border-t border-slate-100" data-plan-table={table.table}>
                      <th scope="row" className="px-4 py-2 font-medium text-slate-800">
                        {table.label}
                      </th>
                      <td className="px-3 py-2 text-right tabular-nums">{table.rows}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{table.update}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{table.create}</td>
                      <td
                        className={cn(
                          "px-3 py-2 text-right tabular-nums",
                          table.replace > 0 && "font-semibold text-amber-700",
                        )}
                      >
                        {table.replace}
                      </td>
                      <td className="px-4 py-2 text-right text-slate-500 tabular-nums">{table.keep}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="border-t border-slate-100 px-4 py-3 text-xs leading-relaxed text-slate-500">
              <strong className="font-semibold text-slate-700">Overwrite</strong>: current rows go back to how they
              were. <strong className="font-semibold text-slate-700">Add back</strong>: rows deleted since the backup
              return. <strong className="font-semibold text-slate-700">Replace</strong>: a newer row using the same web
              address is swapped for the backup’s. <strong className="font-semibold text-slate-700">Keep as is</strong>:
              added since the backup, left alone.
              {prepared.skipped.length > 0
                ? ` Not restored: ${prepared.skipped.map((entry) => `${entry.label.toLowerCase()} (${entry.rows})`).join(", ")}.`
                : ""}
            </p>
          </div>

          {plan.warnings.map((warning) => (
            <Callout key={warning} tone="warning">
              {warning}
            </Callout>
          ))}

          <Field
            label={
              <>
                Type <span className="font-mono">{RESTORE_CONFIRM_WORD}</span> to confirm
              </>
            }
            htmlFor="restore-confirm"
            hint="The website switches to the restored content straight away."
          >
            <Input
              id="restore-confirm"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              disabled={busy === "restoring"}
            />
          </Field>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={clear} disabled={busy === "restoring"}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => void restore()}
              disabled={confirm !== RESTORE_CONFIRM_WORD || busy !== null}
              aria-busy={busy === "restoring" || undefined}
            >
              {busy === "restoring" ? (
                <LoaderCircle className="animate-spin" aria-hidden="true" />
              ) : (
                <RotateCcw aria-hidden="true" />
              )}
              {busy === "restoring" ? "Restoring…" : "Restore website content"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
