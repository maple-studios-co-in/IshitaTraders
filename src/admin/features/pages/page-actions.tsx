"use client";

import { Check, Copy, CopyPlus, EyeOff, Rocket, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ActionButton } from "@/admin/components/ui/action-button";
import { adminButton, type AdminButtonSize } from "@/admin/components/ui/button";
import { ConfirmAction } from "@/admin/components/ui/confirm-action";
import { SubmitButton } from "@/admin/components/ui/submit-button";
import { toast } from "@/admin/components/ui/toaster";
import { useWrappedAction } from "@/admin/components/ui/use-form-action";

import { deletePage, duplicatePage, setPageStatus } from "./actions";

/** Publish a draft, or take a live page back to draft. */
export function PageStatusButton({
  id,
  status,
  size = "md",
}: {
  id: string;
  status: "draft" | "published";
  size?: AdminButtonSize;
}) {
  const publishing = status === "draft";
  return (
    <ActionButton
      action={setPageStatus}
      fields={{ id, status: publishing ? "published" : "draft" }}
      variant={publishing ? "success" : "secondary"}
      size={size}
      pendingLabel={publishing ? "Publishing…" : "Unpublishing…"}
    >
      {publishing ? <Rocket aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
      {publishing ? "Publish" : "Unpublish"}
    </ActionButton>
  );
}

/** Copies the page into a new draft and opens it. */
export function DuplicatePageButton({ id, size = "md" }: { id: string; size?: AdminButtonSize }) {
  const router = useRouter();
  const [, formAction] = useWrappedAction(duplicatePage, {
    onSuccess: (result) => {
      const newId = result.data?.id;
      if (typeof newId === "string") router.push(`/admin/pages/${newId}`);
    },
  });
  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <SubmitButton variant="secondary" size={size} pendingLabel="Copying…">
        <CopyPlus aria-hidden="true" /> Duplicate
      </SubmitButton>
    </form>
  );
}

/** Delete with confirmation; from the editor it returns to the list afterwards. */
export function DeletePageButton({
  id,
  title,
  status,
  backToList = false,
  iconOnly = false,
}: {
  id: string;
  title: string;
  status: "draft" | "published";
  backToList?: boolean;
  iconOnly?: boolean;
}) {
  return (
    <ConfirmAction
      action={deletePage}
      fields={backToList ? { id, redirectTo: "list" } : { id }}
      title="Delete this page?"
      description={
        <>
          “{title}” and its version history will be deleted.
          {status === "published" ? " Its address will show “page not found” from now on." : null} This can’t be undone.
        </>
      }
      confirmLabel="Delete page"
      size={iconOnly ? "icon-sm" : "md"}
      ariaLabel={iconOnly ? `Delete “${title}”` : undefined}
    >
      <Trash2 aria-hidden="true" />
      {iconOnly ? null : "Delete"}
    </ConfirmAction>
  );
}

/** Copies a link to the clipboard. */
export function CopyLinkButton({ url, label = "Copy link" }: { url: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);
  return (
    <button
      type="button"
      className={adminButton({ variant: "ghost", size: "icon-sm" })}
      title={label}
      aria-label={`${label}: ${url}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          toast.success("Link copied.");
        } catch {
          toast.error("Couldn’t copy the link — select it and copy it by hand.");
        }
      }}
    >
      {copied ? <Check className="text-leaf-600" aria-hidden="true" /> : <Copy aria-hidden="true" />}
    </button>
  );
}
