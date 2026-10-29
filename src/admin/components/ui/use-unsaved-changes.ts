"use client";

import { useEffect, useId, type RefObject } from "react";

/** Forms with unsaved edits right now, by hook instance (each may hand over its form element). */
const dirtyForms = new Map<string, RefObject<HTMLFormElement | null> | undefined>();

/**
 * Warns before unsaved edits are lost: the browser's own prompt when the tab is closed or reloaded,
 * and the "Save your changes?" dialog (UnsavedChangesGuard) when an admin link is clicked. Pass the
 * form's ref so that dialog can offer to save it.
 */
export function useUnsavedChanges(dirty: boolean, form?: RefObject<HTMLFormElement | null>) {
  const id = useId();
  useEffect(() => {
    if (!dirty) return;
    dirtyForms.set(id, form);
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      // Discarded from the dialog: leave without asking again.
      if (dirtyForms.has(id)) event.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      dirtyForms.delete(id);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [dirty, form, id]);
}

export function hasUnsavedChanges() {
  return dirtyForms.size > 0;
}

/** The form the dialog's "Save changes" submits: the first one on the page with unsaved edits. */
export function firstUnsavedForm() {
  for (const form of dirtyForms.values()) {
    if (form?.current?.isConnected) return form.current;
  }
  return null;
}

/** "Discard changes": forget every pending edit so leaving the page no longer prompts. */
export function forgetUnsavedChanges() {
  dirtyForms.clear();
}
