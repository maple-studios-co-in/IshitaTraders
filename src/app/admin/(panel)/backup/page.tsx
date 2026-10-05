import { Download, ShieldAlert } from "lucide-react";
import type { Metadata } from "next";

import { adminButton } from "@/admin/components/ui/button";
import { Callout, Card, CardHeader, PageHeader, Table, TD, TH } from "@/admin/components/ui/primitives";
import { getBackupSummary } from "@/admin/features/backup/export";
import { backupTableInfo, backupTables, contentTables, type BackupTable } from "@/admin/features/backup/format";
import { RestorePanel } from "@/admin/features/backup/restore-panel";
import { formatBytes, formatDateTime } from "@/admin/lib/format";
import { requirePermission } from "@/admin/server/auth/guard";

export const metadata: Metadata = { title: "Backup & export" };

const restorable = new Set<BackupTable>(contentTables);

export default async function BackupPage() {
  const user = await requirePermission("backup:export");
  const summary = await getBackupSummary();
  const totalRows = backupTables.reduce((total, table) => total + summary.counts[table], 0);

  // A plain GET form (not <Link>): the response is a file download, not a page.
  const downloadButton = (
    <form action="/api/admin/backup" method="get">
      <button type="submit" className={adminButton({ size: "lg" })} data-backup-download>
        <Download aria-hidden="true" /> Download backup
      </button>
    </form>
  );

  return (
    <>
      <PageHeader
        title="Backup & export"
        description="Everything the admin stores — catalogue, website content, enquiries, messages and the audit trail — in one JSON file you can keep safe."
        breadcrumbs={[{ label: "Administration" }, { label: "Backup & export" }]}
        actions={downloadButton}
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader
              title="What a backup contains"
              description={`${totalRows.toLocaleString("en-IN")} rows · uploaded files take ${formatBytes(summary.mediaBytes)}`}
            />
            <Table>
              <thead>
                <tr>
                  <TH>Data</TH>
                  <TH align="right">Rows</TH>
                  <TH>Notes</TH>
                  <TH>Restorable</TH>
                </tr>
              </thead>
              <tbody>
                {backupTables.map((table) => (
                  <tr key={table} data-backup-table={table}>
                    <TD className="font-medium text-slate-800">{backupTableInfo[table].label}</TD>
                    <TD align="right" className="tabular-nums">
                      {summary.counts[table].toLocaleString("en-IN")}
                    </TD>
                    <TD className="text-xs text-slate-500">
                      {table === "media"
                        ? `${summary.mediaFiles.toLocaleString("en-IN")} files, ${formatBytes(summary.mediaBytes)} — details only, not the files`
                        : (backupTableInfo[table].note ?? "")}
                    </TD>
                    <TD className="text-xs">
                      {restorable.has(table) ? (
                        <span className="font-semibold text-leaf-700">Yes</span>
                      ) : (
                        <span className="text-slate-400">Reference only</span>
                      )}
                    </TD>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>

          <Card>
            <CardHeader
              title="Restore from a backup"
              description="Puts the website content back as it was when the backup was taken."
            />
            <div className="flex flex-col gap-4 p-5">
              {user.role === "owner" ? (
                <>
                  <p className="text-sm leading-relaxed text-slate-600">
                    Restores site settings, brands, categories, products, testimonials, FAQs, HTML pages (with their
                    versions) and redirects. Anything added since the backup stays. Enquiries, messages, users, the
                    activity log and uploaded files are never changed.
                  </p>
                  <Callout tone="warning" title="Download a fresh backup first">
                    It lets you undo the restore if you pick the wrong file.
                  </Callout>
                  <RestorePanel />
                </>
              ) : (
                <Callout tone="info" title="Only an owner can restore">
                  Restoring replaces live website content, so it’s limited to owners. Send them the backup file if
                  something needs to be put back.
                </Callout>
              )}
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-6 xl:sticky xl:top-24">
          <Card>
            <CardHeader title="Download a backup" />
            <div className="flex flex-col gap-4 p-5">
              <p className="text-sm leading-relaxed text-slate-600">
                One file, named with today’s date. Download one regularly — and always before big changes — and keep it
                somewhere safe, like Google Drive.
              </p>
              {downloadButton}
              <p className="text-xs text-slate-500" data-last-export>
                {summary.lastExport
                  ? `Last downloaded ${formatDateTime(summary.lastExport.at)} by ${summary.lastExport.by.replace(/\s*<[^>]*>$/, "")}.`
                  : "No backup has been downloaded yet."}
              </p>
            </div>
          </Card>

          <Callout tone="info" icon={<ShieldAlert />} title="Never included">
            Passwords, sign-in sessions and the uploaded files themselves (images, PDFs). Users appear with their name,
            email and role only.
          </Callout>
          <Callout tone="warning" title="Keep backups private">
            They contain customers’ names, phone numbers and messages. Don’t email them around or share them publicly.
          </Callout>
        </div>
      </div>
    </>
  );
}
