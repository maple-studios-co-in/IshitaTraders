"use client";

import { useActionState, useId, type ReactNode } from "react";

import { submitContactForm } from "@/actions/contact";
import { Button } from "@/components/ui/button";
import { SmartLink } from "@/components/ui/smart-link";
import { cn } from "@/lib/cn";
import { phoneHref, whatsappHref } from "@/lib/contact-links";
import { HONEYPOT_FIELD, initialContactState, type ContactField, type ContactFormState } from "@/lib/contact/types";

const inputClasses =
  "block w-full rounded-[3px] border border-transparent bg-surface-input px-4 text-[15px] text-slate-900 transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-slate-400 hover:bg-[#d9e4f3] focus:border-navy-800 focus:bg-white focus:ring-4 focus:ring-navy-800/10 focus:outline-none aria-invalid:border-red-500 aria-invalid:bg-red-50/60";

export function ContactForm() {
  const [state, formAction, pending] = useActionState<ContactFormState, FormData>(
    submitContactForm,
    initialContactState,
  );

  return (
    <form
      action={formAction}
      noValidate
      className="relative flex flex-col gap-5"
      aria-describedby="contact-form-status"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field name="firstName" label="First name" state={state} autoComplete="given-name" required />
        <Field name="lastName" label="Last name" state={state} autoComplete="family-name" />
      </div>
      <Field name="email" label="Email address" type="email" state={state} autoComplete="email" required />
      <Field name="phone" label="Phone number" type="tel" state={state} autoComplete="tel" inputMode="tel" required />
      <Field
        name="message"
        label={
          <>
            Message <span className="font-light text-neutral-500 italic">(How can we help you?)</span>
          </>
        }
        state={state}
        multiline
        required
      />

      {/* Honeypot: hidden from people and assistive tech, tempting for bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Leave this field empty
          <input type="text" name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>

      <div className="flex flex-col gap-4 pt-2.5 sm:flex-row sm:items-center">
        <Button
          type="submit"
          disabled={pending}
          className="h-auto w-fit rounded-[10px] px-[34.6px] py-[14.8px] font-display text-[14.85px] font-normal tracking-[0.025em] text-neutral-100"
        >
          {pending ? (
            <>
              <span
                aria-hidden="true"
                className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
              />
              Sending…
            </>
          ) : (
            "Send Message"
          )}
        </Button>
        <p
          id="contact-form-status"
          role="status"
          aria-live="polite"
          className={cn(
            "text-sm leading-snug",
            state.status === "success" && "font-medium text-green-700",
            state.status === "error" && "text-red-600",
          )}
        >
          {state.message}
          {state.status === "error" && !state.fieldErrors ? (
            <>
              {" "}
              Please{" "}
              <SmartLink href={phoneHref} className="font-semibold underline underline-offset-2">
                call
              </SmartLink>{" "}
              or{" "}
              <SmartLink href={whatsappHref()} className="font-semibold underline underline-offset-2">
                WhatsApp
              </SmartLink>{" "}
              us and we’ll help right away.
            </>
          ) : null}
        </p>
      </div>
    </form>
  );
}

interface FieldProps {
  name: ContactField;
  label: ReactNode;
  state: ContactFormState;
  type?: "text" | "email" | "tel";
  multiline?: boolean;
  required?: boolean;
  autoComplete?: string;
  inputMode?: "tel" | "email" | "text";
}

function Field({ name, label, state, type = "text", multiline, required, autoComplete, inputMode }: FieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const error = state.fieldErrors?.[name];
  const defaultValue = state.values?.[name] ?? "";
  const shared = {
    id,
    name,
    required,
    defaultValue,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? errorId : undefined,
  };

  return (
    <div className="flex flex-col gap-[7.4px]">
      <label htmlFor={id} className="font-display text-[14.85px] leading-5 text-neutral-800">
        {label}
        {required ? <span className="sr-only"> (required)</span> : null}
      </label>
      {multiline ? (
        <textarea {...shared} rows={6} className={cn(inputClasses, "h-[178px] resize-y py-3.5 leading-relaxed")} />
      ) : (
        <input
          {...shared}
          type={type}
          autoComplete={autoComplete}
          inputMode={inputMode}
          className={cn(inputClasses, "h-[54.5px]")}
        />
      )}
      {error ? (
        <p id={errorId} className="text-[13px] leading-snug text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
