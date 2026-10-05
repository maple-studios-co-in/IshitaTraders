"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { adminButton } from "@/admin/components/ui/button";
import { Field, Input, Select, Toggle } from "@/admin/components/ui/form-controls";
import { SubmitButton } from "@/admin/components/ui/submit-button";
import { useFormAction } from "@/admin/components/ui/use-form-action";

import { saveRedirect } from "./actions";
import { DESTINATION_MAX, REDIRECT_CODES, SOURCE_MAX, redirectCodeInfo } from "./rules";

export interface EditableRedirect {
  id: string;
  source: string;
  destination: string;
  statusCode: number;
  isActive: boolean;
}

/** Add a redirect, or edit one (`redirect` given; returns to the list when saved). */
export function RedirectForm({ redirect }: { redirect?: EditableRedirect }) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);

  const [source, setSource] = useState(redirect?.source ?? "");
  const [destination, setDestination] = useState(redirect?.destination ?? "");
  const [statusCode, setStatusCode] = useState(String(redirect?.statusCode ?? 301));
  const [isActive, setIsActive] = useState(redirect?.isActive ?? true);

  const { state, pending, onSubmit, errors } = useFormAction(saveRedirect, {
    onSuccess: () => {
      // An edit returns to the list.
      if (redirect) return router.replace("/admin/redirects");
      // Ready for the next one.
      setSource("");
      setDestination("");
      setStatusCode("301");
      setIsActive(true);
    },
  });

  // Move focus to the first field the server flagged.
  useEffect(() => {
    if (state.status === "error") form.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
  }, [state]);

  const prefix = redirect ? `redirect-${redirect.id}` : "redirect-new";

  return (
    <form ref={form} onSubmit={onSubmit} className="flex flex-col gap-4">
      {redirect ? <input type="hidden" name="id" value={redirect.id} /> : null}
      <Field
        label="Old address"
        htmlFor={`${prefix}-source`}
        error={errors.source}
        required
        hint="A path on this website, like /old-offer. Capital letters and a trailing slash don’t matter."
      >
        <Input
          id={`${prefix}-source`}
          name="source"
          value={source}
          onChange={(event) => setSource(event.target.value)}
          placeholder="/old-page"
          maxLength={SOURCE_MAX + 100}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          aria-invalid={Boolean(errors.source) || undefined}
          className="font-mono"
        />
      </Field>
      <Field
        label="Send visitors to"
        htmlFor={`${prefix}-destination`}
        error={errors.destination}
        required
        hint="A page on this site (/products) or a full link to another site. Any ?query on the old address, like UTM tags, is passed along."
      >
        <Input
          id={`${prefix}-destination`}
          name="destination"
          value={destination}
          onChange={(event) => setDestination(event.target.value)}
          placeholder="/new-page or https://…"
          maxLength={DESTINATION_MAX}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          aria-invalid={Boolean(errors.destination) || undefined}
          className="font-mono"
        />
      </Field>
      <Field label="Type" htmlFor={`${prefix}-code`} error={errors.statusCode}>
        <Select
          id={`${prefix}-code`}
          name="statusCode"
          value={statusCode}
          onChange={(event) => setStatusCode(event.target.value)}
        >
          {REDIRECT_CODES.map((code) => (
            <option key={code} value={code}>
              {redirectCodeInfo[code].label}
            </option>
          ))}
        </Select>
      </Field>
      <Toggle
        id={`${prefix}-active`}
        name="isActive"
        checked={isActive}
        onChange={(event) => setIsActive(event.target.checked)}
        label="Active"
        description="Paused redirects are kept but not used."
      />
      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
        {redirect ? (
          <Link href="/admin/redirects" className={adminButton({ variant: "ghost" })}>
            Cancel
          </Link>
        ) : null}
        <SubmitButton pending={pending} pendingLabel="Saving…">
          {redirect ? "Save changes" : "Add redirect"}
        </SubmitButton>
      </div>
    </form>
  );
}
