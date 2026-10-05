import { Eye, History, RotateCcw } from "lucide-react";

import { adminButton } from "@/admin/components/ui/button";
import { ConfirmAction } from "@/admin/components/ui/confirm-action";
import { Card, CardHeader } from "@/admin/components/ui/primitives";
import { formatBytes, formatDateTime } from "@/admin/lib/format";

import { restorePageVersion } from "./actions";

export interface PageVersionView {
  id: string;
  title: string;
  note: string;
  createdAt: Date;
  authorName: string | null;
  bytes: number;
}

/** Earlier versions of a page (newest first), each previewable and restorable. */
export function VersionHistory({
  pageId,
  currentTitle,
  versions,
}: {
  pageId: string;
  currentTitle: string;
  versions: PageVersionView[];
}) {
  return (
    <Card>
      <CardHeader
        title="Version history"
        description={
          versions.length
            ? `${versions.length} earlier ${versions.length === 1 ? "version" : "versions"} · the latest 20 are kept`
            : undefined
        }
      />
      {versions.length === 0 ? (
        <p className="flex items-start gap-2 px-5 py-4 text-sm text-slate-500">
          <History className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          No earlier versions yet. Each time the code or title changes, the previous version is kept here so you can go
          back to it.
        </p>
      ) : (
        <ol className="divide-y divide-slate-100">
          {versions.map((version) => {
            const when = formatDateTime(version.createdAt);
            return (
              <li key={version.id} className="flex flex-col gap-2.5 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800">
                    <time dateTime={version.createdAt.toISOString()}>{when}</time>
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {version.note || "Saved version"} · {version.authorName ?? "Someone"} · {formatBytes(version.bytes)}
                  </p>
                  {version.title !== currentTitle ? (
                    <p className="mt-1 truncate text-xs text-slate-600" title={version.title}>
                      Title then: “{version.title}”
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={`/admin/pages/${pageId}/preview?version=${version.id}`}
                    target="_blank"
                    rel="noopener"
                    className={adminButton({ variant: "secondary", size: "sm" })}
                    aria-label={`Preview the version from ${when} (opens in a new tab)`}
                  >
                    <Eye aria-hidden="true" /> Preview
                  </a>
                  <ConfirmAction
                    action={restorePageVersion}
                    fields={{ id: pageId, versionId: version.id }}
                    title="Restore this version?"
                    description={
                      <>
                        The page’s code and title go back to how they were on {when}. What’s there now is saved as a new
                        version first, so you can undo this. Its address and settings don’t change.
                      </>
                    }
                    confirmLabel="Restore version"
                    variant="secondary"
                    confirmVariant="primary"
                    ariaLabel={`Restore the version from ${when}`}
                  >
                    <RotateCcw aria-hidden="true" /> Restore
                  </ConfirmAction>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
