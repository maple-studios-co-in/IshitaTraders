"use client";

import { useEffect, useState } from "react";

import type { FormAction } from "@/admin/lib/action-state";
import { cn } from "@/lib/cn";

import { controlClass } from "./form-controls";
import { SubmitButton } from "./submit-button";
import { useFormAction } from "./use-form-action";

/**
 * Bulk actions for a table: rows render `<input type="checkbox" name="ids" form={formId}>`, the
 * header renders `<SelectAll>`, and this bar appears once something is ticked.
 */
const boxes = (formId: string) =>
  Array.from(document.querySelectorAll<HTMLInputElement>(`input[type=checkbox][form="${formId}"][name="ids"]`));

export function SelectAll({ formId, label }: { formId: string; label: string }) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      data-select-all={formId}
      className="size-4 rounded border-slate-300 accent-navy-800"
      onChange={(event) => {
        for (const box of boxes(formId)) box.checked = event.target.checked;
        document.dispatchEvent(new CustomEvent("bulk-selection", { detail: formId }));
      }}
    />
  );
}

export interface BulkOperationOption {
  value: string;
  label: string;
  /** Asks for confirmation and shows a red button. */
  destructive?: boolean;
}

export function BulkBar({
  formId,
  action,
  operations,
  noun,
}: {
  formId: string;
  action: FormAction;
  operations: BulkOperationOption[];
  noun: [string, string];
}) {
  const [selected, setSelected] = useState(0);
  const [operation, setOperation] = useState(operations[0]?.value ?? "");
  const current = operations.find((item) => item.value === operation);
  const { pending, onSubmit } = useFormAction(action, {
    onSuccess: () => {
      for (const box of boxes(formId)) box.checked = false;
      const all = document.querySelector<HTMLInputElement>(`input[data-select-all="${formId}"]`);
      if (all) all.checked = false;
      setSelected(0);
    },
  });

  useEffect(() => {
    const recount = () => setSelected(boxes(formId).filter((box) => box.checked).length);
    const onChange = (event: Event) => {
      if (event.target instanceof HTMLInputElement && event.target.form?.id === formId) recount();
    };
    document.addEventListener("change", onChange);
    document.addEventListener("bulk-selection", recount);
    return () => {
      document.removeEventListener("change", onChange);
      document.removeEventListener("bulk-selection", recount);
    };
  }, [formId]);

  const label = `${selected} ${selected === 1 ? noun[0] : noun[1]}`;
  return (
    <form
      id={formId}
      onSubmit={(event) => {
        if (current?.destructive && !window.confirm(`${current.label} ${label}? This can’t be undone.`)) {
          event.preventDefault();
          return;
        }
        onSubmit(event);
      }}
      className={cn(
        "flex flex-wrap items-center gap-2 border-b border-navy-800/15 bg-navy-800/5 px-4 py-2.5 text-sm",
        selected === 0 && "hidden",
      )}
      aria-hidden={selected === 0}
    >
      <span className="font-semibold text-navy-900">{selected} selected</span>
      <label className="sr-only" htmlFor={`${formId}-operation`}>
        Action
      </label>
      <select
        id={`${formId}-operation`}
        name="operation"
        value={operation}
        onChange={(event) => setOperation(event.target.value)}
        className={cn(controlClass, "h-8 w-auto")}
      >
        {operations.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
      <SubmitButton
        pending={pending}
        size="sm"
        variant={current?.destructive ? "danger" : "primary"}
        pendingLabel="Applying…"
      >
        Apply to {selected}
      </SubmitButton>
    </form>
  );
}
