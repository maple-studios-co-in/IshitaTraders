"use client";

import { useActionState, useId, useState, type ReactNode } from "react";

import { submitEnquiryForm } from "@/actions/contact";
import { AttributionFields } from "@/admin/site/attribution";
import { SmartLink } from "@/components/ui/smart-link";
import { contactPage, enquiryTypes } from "@/content/contact-page";
import { cn } from "@/lib/cn";
import { HONEYPOT_FIELD, initialEnquiryState, type EnquiryField, type EnquiryFormState } from "@/lib/contact/types";

import { FigmaIcon, type FigmaIconName } from "./figma-icons";

const fieldClasses =
  "block w-full rounded-[14px] border border-[#e2e8f0] bg-[rgb(248_250_252/0.5)] text-[16px] text-[#0f172a] transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-[#94a3b8] hover:border-[#cbd5e1] focus:border-[#0066ff] focus:bg-white focus:ring-4 focus:ring-[#0066ff]/10 focus:outline-none aria-invalid:border-red-400 aria-invalid:bg-red-50/50 sm:text-[16.7px]";

/** "Send Us an Enquiry" (Figma 285:169). Submissions land in Admin → Enquiries (“Contact page enquiry”). */
export function EnquiryCard({ phoneHref, whatsappHref }: { phoneHref: string; whatsappHref: string }) {
  // A fresh form (new key) after "Send another enquiry".
  const [round, setRound] = useState(0);
  return (
    <div className="rounded-[24px] border border-[rgb(226_232_240/0.8)] bg-[#f2f8fe] p-5 shadow-[0_1px_1px_rgb(0_0_0/0.05),0_30px_60px_-30px_rgb(8_20_60/0.45)] min-[400px]:p-6 sm:rounded-[28.7px] sm:p-[39px]">
      <EnquiryForm
        key={round}
        phoneHref={phoneHref}
        whatsappHref={whatsappHref}
        onAnother={() => setRound((value) => value + 1)}
      />
    </div>
  );
}

function EnquiryForm({
  phoneHref,
  whatsappHref,
  onAnother,
}: {
  phoneHref: string;
  whatsappHref: string;
  onAnother: () => void;
}) {
  const [state, formAction, pending] = useActionState<EnquiryFormState, FormData>(
    submitEnquiryForm,
    initialEnquiryState,
  );
  const typeErrorId = useId();

  if (state.status === "success") {
    return (
      <div role="status" className="flex flex-col items-start gap-4 py-6">
        <span className="grid size-14 place-items-center rounded-full bg-[#1f3b8a] text-white">
          <FigmaIcon name="send" className="size-6 -rotate-45 [&_path]:fill-white" />
        </span>
        <h2 className="font-display text-[26px] leading-[1.3] font-bold text-[#0f172a] sm:text-[28.7px]">
          Enquiry sent
        </h2>
        <p className="max-w-md font-display text-[16px] leading-[1.5] text-[#475569]">{state.message}</p>
        <button
          type="button"
          onClick={onAnother}
          className="mt-2 rounded-[12px] border border-[#1f3b8a] px-5 py-2.5 font-display text-[15px] font-semibold text-[#1f3b8a] transition-colors hover:bg-[#1f3b8a] hover:text-white"
        >
          Send another enquiry
        </button>
      </div>
    );
  }

  const values = state.values ?? {};
  const typeError = state.fieldErrors?.type;
  const selectedType = values.type || enquiryTypes[0].value;

  return (
    <form action={formAction} noValidate aria-describedby="enquiry-form-status" className="relative">
      <h2
        id="enquiry-form-title"
        className="font-display text-[24px] leading-[1.33] font-bold text-[#0f172a] sm:text-[28.7px]"
      >
        {contactPage.form.title}
      </h2>
      <p className="mt-1 font-display text-[15px] leading-[1.43] text-[#64748b] sm:text-[16.7px]">
        {contactPage.form.subtitle}
      </p>

      <div className="mt-6 flex flex-col gap-6 sm:gap-[30px]">
        <div className="grid gap-6 sm:grid-cols-2 sm:gap-[19px]">
          <TextField
            name="name"
            label="Your Name"
            icon="user"
            placeholder="Enter your name"
            autoComplete="name"
            state={state}
            required
          />
          <TextField
            name="phone"
            label="Phone Number"
            icon="phoneField"
            placeholder="Enter your phone number"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            state={state}
            required
          />
        </div>
        <TextField
          name="email"
          label="Email Address"
          icon="mailField"
          placeholder="Enter your email (optional)"
          type="email"
          inputMode="email"
          autoComplete="email"
          state={state}
        />

        <fieldset aria-describedby={typeError ? typeErrorId : undefined} className="flex flex-col gap-2.5">
          <legend className="mb-2.5 font-display text-[14.3px] leading-[19px] font-semibold text-[#334155]">
            Enquiry Type <Required />
          </legend>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-[14px] lg:grid-cols-2 xl:grid-cols-3">
            {enquiryTypes.map((option) => (
              <label
                key={option.value}
                className="flex min-h-[64.5px] cursor-pointer items-center gap-3 rounded-[14px] border border-[#e2e8f0] bg-white/40 p-3 transition-[border-color,background-color,box-shadow] duration-200 hover:border-[#94b8f5] has-checked:border-[#0066ff] has-checked:bg-[rgb(239_246_255/0.6)] has-focus-visible:ring-4 has-focus-visible:ring-[#0066ff]/15 sm:p-[15.5px] sm:pl-[27px]"
              >
                <input
                  type="radio"
                  name="type"
                  value={option.value}
                  defaultChecked={selectedType === option.value}
                  required
                  className="sr-only"
                />
                <span className={cn("grid size-[33.5px] shrink-0 place-items-center rounded-[9.5px]", option.tint)}>
                  <FigmaIcon name={option.icon} className={option.icon === "sun" ? "size-6" : "size-[19px]"} />
                </span>
                <span className="font-display text-[13.5px] leading-[18px] font-semibold text-[#1e293b] sm:text-[14.3px]">
                  {option.value}
                </span>
              </label>
            ))}
          </div>
          {typeError ? (
            <p id={typeErrorId} className="text-[13px] leading-snug text-red-600">
              {typeError}
            </p>
          ) : null}
        </fieldset>

        <TextField
          name="message"
          label="Your Message"
          placeholder="Tell us about your requirement..."
          state={state}
          multiline
          required
        />
      </div>

      <AttributionFields />

      {/* Honeypot: hidden from people and assistive tech, tempting for bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Leave this field empty
          <input type="text" name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="group mt-7 flex w-full items-center justify-center gap-2.5 rounded-[14px] bg-[#1f3b8a] px-6 py-[15px] font-display text-[16.7px] leading-6 font-semibold text-white shadow-[0_4.8px_7.2px_-1.2px_rgb(59_130_246/0.25),0_2.4px_4.8px_-2.4px_rgb(59_130_246/0.25)] transition-colors duration-300 hover:bg-[#172f72] disabled:cursor-wait disabled:opacity-80"
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
          <>
            <FigmaIcon
              name="send"
              className="size-[19px] -rotate-45 transition-transform duration-300 ease-out-expo group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
            {contactPage.form.submit}
            <span aria-hidden="true">→</span>
          </>
        )}
      </button>

      <p
        id="enquiry-form-status"
        role="status"
        aria-live="polite"
        className={cn("text-sm leading-snug", state.status === "error" && "mt-4 text-red-600")}
      >
        {state.status === "error" ? (
          <>
            {state.message}
            {!state.fieldErrors ? (
              <>
                {" "}
                Please{" "}
                <SmartLink href={phoneHref} className="font-semibold underline underline-offset-2">
                  call
                </SmartLink>{" "}
                or{" "}
                <SmartLink href={whatsappHref} className="font-semibold underline underline-offset-2">
                  WhatsApp
                </SmartLink>{" "}
                us and we’ll help right away.
              </>
            ) : null}
          </>
        ) : null}
      </p>
    </form>
  );
}

function Required() {
  return (
    <>
      <span aria-hidden="true" className="text-[#ef4444]">
        *
      </span>
      <span className="sr-only">(required)</span>
    </>
  );
}

interface TextFieldProps {
  name: Exclude<EnquiryField, "type">;
  label: string;
  placeholder: string;
  state: EnquiryFormState;
  icon?: FigmaIconName;
  type?: "text" | "email" | "tel";
  inputMode?: "text" | "email" | "tel";
  autoComplete?: string;
  multiline?: boolean;
  required?: boolean;
}

function TextField({
  name,
  label,
  placeholder,
  state,
  icon,
  type = "text",
  inputMode,
  autoComplete,
  multiline,
  required,
}: TextFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const error = state.fieldErrors?.[name];
  const shared = {
    id,
    name,
    placeholder,
    required,
    defaultValue: state.values?.[name] ?? "",
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? errorId : undefined,
  };

  return (
    <div className="flex flex-col gap-[7px]">
      <label htmlFor={id} className="font-display text-[14.3px] leading-[19px] font-semibold text-[#334155]">
        {label} {required ? <Required /> : null}
      </label>
      {multiline ? (
        <textarea
          {...shared}
          rows={4}
          className={cn(fieldClasses, "min-h-[122px] resize-y px-[18px] py-[13px] leading-[1.43]")}
        />
      ) : (
        <FieldShell icon={icon}>
          <input
            {...shared}
            type={type}
            inputMode={inputMode}
            autoComplete={autoComplete}
            className={cn(fieldClasses, "h-[52px] pr-4", icon ? "pl-11" : "pl-4")}
          />
        </FieldShell>
      )}
      {error ? (
        <p id={errorId} className="text-[13px] leading-snug text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function FieldShell({ icon, children }: { icon?: FigmaIconName; children: ReactNode }) {
  return (
    <div className="relative">
      {children}
      {icon ? (
        <FigmaIcon
          name={icon}
          className="pointer-events-none absolute top-1/2 left-[14px] size-[19px] -translate-y-1/2"
        />
      ) : null}
    </div>
  );
}
