"use client";

import { useRef, useState } from "react";

import { Field, Textarea } from "@/admin/components/ui/form-controls";
import { SubmitButton } from "@/admin/components/ui/submit-button";
import { useFormAction } from "@/admin/components/ui/use-form-action";
import { cn } from "@/lib/cn";

import { importRedirects } from "./actions";

/** Bulk import: pasted lines or a .csv file of `old,new[,code]`. */
export function ImportRedirectsForm() {
  const [csv, setCsv] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const { pending, onSubmit, errors } = useFormAction(importRedirects, {
    onSuccess: () => {
      setCsv("");
      if (fileInput.current) fileInput.current.value = "";
    },
  });
  const problems = errors.csv ? errors.csv.split("\n") : [];

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field
        label="Redirects"
        htmlFor="import-csv"
        hint="One per line: old address, new address and, optionally, the type (301 if left out). A header row is fine."
      >
        <Textarea
          id="import-csv"
          name="csv"
          rows={6}
          value={csv}
          onChange={(event) => setCsv(event.target.value)}
          placeholder={"/old-offer,/diwali-offer,301\n/brochure,https://example.com/brochure.pdf,302"}
          spellCheck={false}
          wrap="off"
          aria-invalid={problems.length > 0 || undefined}
          aria-describedby={problems.length ? "import-problems" : undefined}
          className="font-mono text-xs whitespace-pre"
        />
      </Field>
      {problems.length ? (
        <ul
          id="import-problems"
          role="alert"
          className="flex flex-col gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800"
        >
          {problems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      ) : null}
      <Field
        label="…or a CSV file"
        htmlFor="import-file"
        error={errors.file}
        hint="Saved from Excel or Google Sheets (“Download as CSV”), up to 200 KB."
      >
        <input
          ref={fileInput}
          id="import-file"
          type="file"
          name="file"
          accept=".csv,text/csv,text/plain"
          aria-invalid={Boolean(errors.file) || undefined}
          className={cn(
            "block w-full cursor-pointer text-sm text-slate-600",
            "file:mr-3 file:cursor-pointer file:rounded-md file:border file:border-slate-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-navy-900 hover:file:border-navy-800",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
          )}
        />
      </Field>
      <div className="flex justify-end">
        <SubmitButton pending={pending} variant="secondary" pendingLabel="Importing…">
          Import redirects
        </SubmitButton>
      </div>
    </form>
  );
}
