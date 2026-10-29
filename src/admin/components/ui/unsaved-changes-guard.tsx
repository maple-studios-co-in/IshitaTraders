"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { adminButton } from "./button";
import { FORM_SETTLED_EVENT } from "./use-form-action";
import { firstUnsavedForm, forgetUnsavedChanges, hasUnsavedChanges } from "./use-unsaved-changes";

/**
 * "Save your changes?": when a link inside the admin is clicked while a form has unsaved edits
 * (useUnsavedChanges), stop the navigation and ask — save and continue, discard and continue, or
 * keep editing. Links that open a new tab or download are left alone; closing or reloading the tab
 * gets the browser's own prompt instead.
 */
export function UnsavedChangesGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const dialog = useRef<HTMLDialogElement>(null);
  const pending = useRef<HTMLAnchorElement | null>(null);
  const passThrough = useRef(false);
  const [canSave, setCanSave] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (passThrough.current || event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (!hasUnsavedChanges()) return;
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(link instanceof HTMLAnchorElement) || link.hasAttribute("download")) return;
      if (link.target && link.target !== "_self") return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      // Capture phase on the document: runs before Next's <Link> handler, so this stops it.
      event.preventDefault();
      event.stopPropagation();
      pending.current = link;
      setCanSave(firstUnsavedForm() !== null);
      setSaving(false);
      dialog.current?.showModal();
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // Whatever navigation happens (e.g. a save that redirects), the question no longer applies.
  useEffect(() => {
    dialog.current?.close();
  }, [pathname]);

  const leave = () => {
    const link = pending.current;
    pending.current = null;
    dialog.current?.close();
    forgetUnsavedChanges();
    if (!link) return;
    if (!link.isConnected) {
      router.push(link.href);
      return;
    }
    passThrough.current = true;
    try {
      link.click();
    } finally {
      passThrough.current = false;
    }
  };

  const save = () => {
    const form = firstUnsavedForm();
    if (!form) return leave();
    setSaving(true);
    form.addEventListener(
      FORM_SETTLED_EVENT,
      (event) => {
        setSaving(false);
        if ((event as CustomEvent<string>).detail === "success") leave();
        // Not saved (e.g. a field needs fixing): stay, so the form can show what's wrong.
        else dialog.current?.close();
      },
      { once: true },
    );
    form.requestSubmit();
  };

  return (
    <dialog
      ref={dialog}
      aria-labelledby="unsaved-changes-title"
      className="m-auto w-[min(460px,calc(100vw-2rem))] rounded-2xl border border-slate-200 p-0 shadow-2xl backdrop:bg-navy-950/45 backdrop:backdrop-blur-[2px]"
      onClick={(event) => {
        if (event.target === dialog.current && !saving) dialog.current?.close();
      }}
      onCancel={(event) => {
        if (saving) event.preventDefault();
      }}
    >
      <div className="flex flex-col gap-4 p-6">
        <div>
          <h2 id="unsaved-changes-title" className="font-display text-lg font-bold text-navy-950">
            Save your changes?
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
            You have unsaved changes on this page. Save them before you leave, or discard them.
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <button
            type="button"
            className={adminButton({ variant: "secondary" })}
            disabled={saving}
            onClick={() => dialog.current?.close()}
          >
            Keep editing
          </button>
          <button type="button" className={adminButton({ variant: "danger-ghost" })} disabled={saving} onClick={leave}>
            Discard changes
          </button>
          {canSave ? (
            <button type="button" className={adminButton({ variant: "primary" })} disabled={saving} onClick={save}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          ) : null}
        </div>
      </div>
    </dialog>
  );
}
