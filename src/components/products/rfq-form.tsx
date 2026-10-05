"use client";

import Image from "next/image";
import { CircleCheck } from "lucide-react";
import { useActionState, useEffect, useId, useRef, type HTMLAttributes } from "react";

import whatsappLogo from "@/assets/images/icons/whatsapp.png";
import { submitProductRfq } from "@/admin/features/enquiries/public-actions";
import type { ContactLinks } from "@/admin/content/links";
import { AttributionFields } from "@/admin/site/attribution";
import {
  initialRfqState,
  RFQ_HONEYPOT,
  rfqFieldLabels,
  rfqFields,
  type RfqField,
  type RfqFormState,
} from "@/admin/site/rfq";
import { PhoneIcon } from "@/components/icons";
import { Button, ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/cn";

import { ShieldCheckIcon } from "./icons";

const controlClasses =
  "block w-full rounded-[4px] border border-slate-300 bg-white px-[11px] font-display text-base text-slate-900 transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-slate-400 hover:border-slate-400 focus:border-navy-700 focus:ring-4 focus:ring-navy-700/10 focus:outline-none aria-invalid:border-red-500 aria-invalid:bg-red-50/50 sm:text-[12px]";

interface RfqSectionProps {
  productSlug: string;
  productName: string;
  title: string;
  subtitle: string;
  links: ContactLinks;
  whatsappHref: string;
  phoneDisplay: string;
}

/**
 * "Direct Institutional Enquiry / RFQ" (Figma 224:7051). Submissions are validated on the server
 * and land in Admin → Enquiries as "Product enquiry / RFQ".
 */
export function RfqSection({
  productSlug,
  productName,
  title,
  subtitle,
  links,
  whatsappHref,
  phoneDisplay,
}: RfqSectionProps) {
  const [state, formAction, pending] = useActionState<RfqFormState, FormData>(submitProductRfq, initialRfqState);
  const formRef = useRef<HTMLFormElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);

  // After a submission: take keyboard users to the first problem. Disabling the submit button
  // while pending drops focus to <body>, so otherwise bring it back to the outcome message.
  useEffect(() => {
    if (state.status === "idle") return;
    const first = rfqFields.find((field) => state.fieldErrors?.[field]);
    const control = first ? formRef.current?.elements.namedItem(first) : null;
    if (control instanceof HTMLElement) control.focus();
    else if (!formRef.current?.contains(document.activeElement)) statusRef.current?.focus();
  }, [state]);

  return (
    <section
      id="product-rfq"
      aria-labelledby="product-rfq-title"
      data-track-context="product-rfq"
      className="flex scroll-mt-4 flex-col gap-3 rounded-[8px] border border-slate-200 bg-slate-50/90 p-4 sm:p-[21px]"
    >
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-[11px]">
        <div className="flex flex-col gap-px">
          <h3
            id="product-rfq-title"
            tabIndex={-1}
            className="font-display text-[14px] leading-5 font-bold tracking-[-0.025em] text-slate-900 outline-none"
          >
            {title}
          </h3>
          {subtitle ? <p className="font-display text-[11px] leading-[16.5px] text-slate-500">{subtitle}</p> : null}
        </div>
        <span
          aria-hidden="true"
          className="flex shrink-0 rounded-full border border-amber-200/50 bg-amber-100/60 p-[7px] text-amber-600"
        >
          <ShieldCheckIcon className="size-4" />
        </span>
      </div>

      <form
        ref={formRef}
        action={formAction}
        noValidate
        aria-labelledby="product-rfq-title"
        aria-describedby="product-rfq-status"
        className="relative flex flex-col gap-[13px]"
      >
        <input type="hidden" name="productSlug" value={productSlug} />
        <AttributionFields />
        {/* Honeypot: hidden from people and assistive tech, tempting for bots. */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label>
            Leave this field empty
            <input type="text" name={RFQ_HONEYPOT} tabIndex={-1} autoComplete="off" defaultValue="" />
          </label>
        </div>

        <div className="grid gap-[13px] sm:grid-cols-2 sm:gap-[14px]">
          <Field
            name="company"
            state={state}
            autoComplete="organization"
            placeholder="e.g. Apex Industrial Systems Ltd."
          />
          <Field name="contactName" state={state} autoComplete="name" placeholder="e.g. Er. Rajiv Sharma" />
        </div>
        <div className="grid gap-[13px] sm:grid-cols-2 sm:gap-[14px] md:grid-cols-12">
          <Field
            name="email"
            state={state}
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="procurement@apex.com"
            className="sm:col-span-2 md:col-span-5"
          />
          <Field
            name="phone"
            state={state}
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            placeholder="+91 98765 43210"
            className="md:col-span-4"
          />
          <Field
            name="quantity"
            state={state}
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            placeholder="e.g. 25"
            className="md:col-span-3"
          />
        </div>
        <Field
          name="application"
          state={state}
          multiline
          placeholder="Specify site requirements, inverter pairing, freight destination, or target delivery timeframe…"
          className="pb-1.5"
        />

        {/* Always rendered so screen readers hear the outcome; out of the flow (no gap) while empty. */}
        <p
          id="product-rfq-status"
          ref={statusRef}
          role="status"
          tabIndex={-1}
          className={cn(
            "text-[12.5px] leading-[18px] outline-none empty:absolute empty:size-px empty:overflow-hidden",
            state.status === "success" &&
              "flex items-start gap-2 rounded-[6px] border border-green-200 bg-green-50 px-3 py-2.5 font-semibold text-green-800",
            state.status === "error" && "font-medium text-red-600",
          )}
        >
          {state.status === "success" ? <CircleCheck aria-hidden="true" className="mt-px size-4 shrink-0" /> : null}
          {state.message}
        </p>

        <div className="flex flex-col gap-3 pt-[9px] sm:flex-row sm:items-center sm:justify-between">
          <div className="grid grid-cols-2 gap-3 sm:flex">
            <ButtonLink
              href={whatsappHref}
              variant="outline"
              aria-label={`WhatsApp Us about ${productName} (opens in a new tab)`}
              className="h-11 gap-2.5 rounded-[6.2px] px-3 font-display text-[12px] font-bold sm:h-[34px] sm:w-[152px]"
            >
              <Image src={whatsappLogo} alt="" width={24} height={24} className="size-6" />
              WhatsApp Us
            </ButtonLink>
            <ButtonLink
              href={links.phone}
              variant="accent"
              aria-label={`Call ${phoneDisplay}`}
              className="h-11 gap-2.5 rounded-[6.2px] px-3 font-display text-[12px] font-semibold sm:h-[34px] sm:w-[152px]"
            >
              <PhoneIcon className="size-[17px]" />
              {phoneDisplay}
            </ButtonLink>
          </div>
          <Button
            type="submit"
            disabled={pending}
            aria-label={pending ? "Submitting your RFQ" : undefined}
            className="h-11 rounded-[4px] bg-navy-700 px-5 font-display text-[12px] font-bold sm:h-[35px]"
          >
            {pending ? (
              <>
                <span
                  aria-hidden="true"
                  className="size-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white"
                />
                Submitting…
              </>
            ) : (
              "Submit Institutional RFQ"
            )}
          </Button>
        </div>
      </form>
    </section>
  );
}

interface FieldProps extends Pick<HTMLAttributes<HTMLInputElement>, "inputMode"> {
  name: RfqField;
  state: RfqFormState;
  type?: "text" | "email" | "tel" | "number";
  autoComplete?: string;
  placeholder?: string;
  multiline?: boolean;
  min?: number;
  step?: number;
  className?: string;
}

function Field({
  name,
  state,
  type = "text",
  autoComplete,
  inputMode,
  placeholder,
  multiline,
  min,
  step,
  className,
}: FieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const error = state.fieldErrors?.[name];
  const shared = {
    id,
    name,
    required: true,
    placeholder,
    defaultValue: state.values?.[name] ?? "",
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? errorId : undefined,
  };

  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <label
        htmlFor={id}
        className="font-display text-[11px] leading-[16.5px] font-bold tracking-[0.05em] text-slate-700 uppercase"
      >
        {rfqFieldLabels[name]}{" "}
        <span aria-hidden="true" className="text-red-500">
          *
        </span>
      </label>
      {multiline ? (
        <textarea
          {...shared}
          rows={2}
          className={cn(controlClasses, "min-h-24 resize-y py-[9px] leading-4 sm:min-h-[50px]")}
        />
      ) : (
        <input
          {...shared}
          type={type}
          autoComplete={autoComplete}
          inputMode={inputMode}
          min={min}
          step={step}
          className={cn(controlClasses, "h-11 sm:h-[30px]")}
        />
      )}
      {error ? (
        <p id={errorId} className="text-[11.5px] leading-4 font-medium text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
