"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";

import { recordWhatsAppEnquiry } from "@/actions/enquiry";
import { AttributionFields } from "@/admin/site/attribution";
import { cn } from "@/lib/cn";
import { enquiryLimits, HONEYPOT_FIELD, INDIAN_MOBILE, normalizePhone } from "@/lib/contact/types";

import { ActionButton } from "./ui";

type FieldName = "name" | "phone" | "interest" | "message";
type Values = Record<FieldName, string>;
type Errors = Partial<Record<"name" | "phone", string>>;

const emptyValues: Values = { name: "", phone: "", interest: "", message: "" };

function validate(values: Values): Errors {
  const errors: Errors = {};
  if (values.name.trim().length < 2) errors.name = "Please enter your name.";
  if (!INDIAN_MOBILE.test(normalizePhone(values.phone))) errors.phone = "Please enter a valid 10-digit mobile number.";
  return errors;
}

function whatsappText({ name, phone, interest, message }: Values, businessName: string) {
  return [
    `Hi ${businessName}, I’m ${name.trim()}.`,
    interest ? `I’m interested in: ${interest}.` : "",
    message.trim(),
    `My number: ${phone.trim()}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

/**
 * "Let’s power your next step." form: checks the name and number, opens WhatsApp with the message
 * written out for the visitor to review and send, and keeps a copy in Admin → Enquiries. Links on
 * the page marked `data-enquire` (and `data-enquire-message`) pre-fill it before scrolling here.
 */
export function EnquiryForm({
  whatsappNumber,
  businessName,
  interests,
  submitLabel,
  note,
}: {
  whatsappNumber: string;
  businessName: string;
  interests: string[];
  submitLabel: string;
  note: string;
}) {
  const [values, setValues] = useState(emptyValues);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<{ text: string; retryHref?: string } | null>(null);
  const [, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const statusId = useId();

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.<HTMLElement>("[data-enquire]");
      if (!link) return;
      const interest = link.dataset.enquire ?? "";
      const message = link.dataset.enquireMessage;
      setValues((current) => ({
        ...current,
        interest: interests.includes(interest) ? interest : current.interest,
        message: message ?? current.message,
      }));
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [interests]);

  const set = (name: FieldName) => (value: string) => {
    setValues((current) => ({ ...current, [name]: value }));
    if (name === "name" || name === "phone") setErrors((current) => ({ ...current, [name]: undefined }));
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found = validate(values);
    setErrors(found);
    const firstInvalid = (["name", "phone"] as const).find((name) => found[name]);
    if (firstInvalid) {
      setStatus(null);
      formRef.current?.querySelector<HTMLElement>(`[name="${firstInvalid}"]`)?.focus();
      return;
    }

    // Opened straight from the click, so pop-up blockers let it through.
    const href = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappText(values, businessName))}`;
    const tab = window.open(href, "_blank");
    if (tab) tab.opener = null;
    setStatus(
      tab
        ? { text: "WhatsApp is open in a new tab — review your message there and press send." }
        : { text: "Your browser didn’t open WhatsApp.", retryHref: href },
    );

    const data = new FormData(event.currentTarget);
    startTransition(async () => {
      await recordWhatsAppEnquiry(data);
    });
  };

  return (
    <form ref={formRef} noValidate onSubmit={onSubmit} aria-describedby={statusId} className="relative flex flex-col">
      <div className="flex flex-col gap-6">
        <FloatingField id="enquiry-name" label="Your name" filled={values.name !== ""} error={errors.name}>
          {(props) => (
            <input
              {...props}
              name="name"
              autoComplete="name"
              maxLength={enquiryLimits.name}
              value={values.name}
              onChange={(event) => set("name")(event.target.value)}
              required
            />
          )}
        </FloatingField>
        <FloatingField id="enquiry-phone" label="Phone number" filled={values.phone !== ""} error={errors.phone}>
          {(props) => (
            <input
              {...props}
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={enquiryLimits.phone}
              value={values.phone}
              onChange={(event) => set("phone")(event.target.value)}
              required
            />
          )}
        </FloatingField>
        <FloatingField id="enquiry-interest" label="Interested in" filled={values.interest !== ""} select>
          {(props) => (
            <select
              {...props}
              name="interest"
              value={values.interest}
              onChange={(event) => set("interest")(event.target.value)}
            >
              <option value="" disabled hidden />
              {interests.map((interest) => (
                <option key={interest} value={interest}>
                  {interest}
                </option>
              ))}
            </select>
          )}
        </FloatingField>
        <MessageField value={values.message} onChange={set("message")} />
      </div>

      <AttributionFields />
      {/* Honeypot: hidden from people and assistive tech, tempting for bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Leave this field empty
          <input type="text" name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>

      <ActionButton type="submit" tone="white" className="mt-6 w-full max-w-[260px]">
        {submitLabel}
      </ActionButton>
      <p className="mt-6 text-[12px] leading-[1.5] text-white">{note}</p>
      <p id={statusId} role="status" className="mt-2 text-[13px] leading-[1.5] text-white empty:mt-0">
        {status?.text}
        {status?.retryHref ? (
          <>
            {" "}
            <a
              href={status.retryHref}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            >
              Open WhatsApp
            </a>
          </>
        ) : null}
      </p>
    </form>
  );
}

const controlClasses =
  "peer block w-full rounded-none border-0 border-b border-ish-line/80 bg-transparent pt-0 pb-4 text-[16px] leading-[21px] text-white outline-none transition-colors duration-200 hover:border-white/90 focus:border-white aria-invalid:border-[#ffe08a] focus-visible:outline-none";

interface ControlProps {
  id: string;
  className: string;
  "aria-invalid"?: true;
  "aria-describedby"?: string;
}

/**
 * The design's underlined field: its label rests on the line like a placeholder and lifts above
 * it, smaller, while the field is in use or filled.
 */
function FloatingField({
  id,
  label,
  filled,
  error,
  select,
  children,
}: {
  id: string;
  label: string;
  filled: boolean;
  error?: string;
  select?: boolean;
  children: (props: ControlProps) => ReactNode;
}) {
  const errorId = `${id}-error`;
  return (
    <div className="group relative" data-filled={filled || undefined}>
      {children({
        id,
        className: cn(
          controlClasses,
          select && "cursor-pointer appearance-none pr-7 [&_option]:bg-ish-blue [&_option]:text-white",
        ),
        "aria-invalid": error ? true : undefined,
        "aria-describedby": error ? errorId : undefined,
      })}
      <label
        htmlFor={id}
        className="pointer-events-none absolute top-0 left-0 origin-[0_0] text-[14px] leading-[21px] text-white transition-[translate,scale,color] duration-200 ease-out group-data-filled:-translate-y-[19px] group-data-filled:scale-[0.857] group-data-filled:text-ish-line peer-focus:-translate-y-[19px] peer-focus:scale-[0.857] peer-focus:text-ish-line"
      >
        {label}
      </label>
      {select ? (
        <svg
          viewBox="0 0 16 16"
          aria-hidden="true"
          className="pointer-events-none absolute top-[3px] right-0 size-4 text-white/85"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m4 6 4 4 4-4" />
        </svg>
      ) : null}
      {error ? (
        <p id={errorId} className="mt-2 text-[12px] leading-[1.5] text-[#ffe08a]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** "Tell us what you need": one line at rest, growing with the message. */
function MessageField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const area = ref.current;
    if (!area) return;
    area.style.height = "auto";
    // scrollHeight leaves out the underline; add it so a short message never shows a scrollbar.
    area.style.height = `${area.scrollHeight + area.offsetHeight - area.clientHeight}px`;
  }, [value]);

  return (
    <FloatingField id="enquiry-message" label="Tell us what you need" filled={value !== ""}>
      {(props) => (
        <textarea
          {...props}
          ref={ref}
          name="message"
          rows={1}
          maxLength={enquiryLimits.message}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={cn(props.className, "max-h-60 resize-none overflow-y-auto")}
        />
      )}
    </FloatingField>
  );
}
