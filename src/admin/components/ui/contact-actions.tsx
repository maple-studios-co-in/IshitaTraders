import { Mail, MessageCircle, Phone } from "lucide-react";

import { whatsappDigits } from "@/admin/lib/format";

import { adminButton } from "./button";

/** One-click replies to a lead: WhatsApp (pre-filled), call, email. Rendered only for known channels. */
export function ContactActions({
  phone,
  email,
  name,
  whatsappMessage,
  emailSubject,
  size = "sm",
}: {
  phone?: string;
  email?: string;
  name?: string;
  whatsappMessage?: string;
  emailSubject?: string;
  size?: "sm" | "md";
}) {
  const digits = phone ? whatsappDigits(phone) : "";
  const greeting =
    whatsappMessage ?? `Hello${name ? ` ${name.split(" ")[0]}` : ""}, this is Ishita Traders replying to your enquiry.`;
  if (!digits && !email) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {digits ? (
        <a
          href={`https://wa.me/${digits}?text=${encodeURIComponent(greeting)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={adminButton({ variant: "success", size })}
        >
          <MessageCircle aria-hidden="true" /> WhatsApp
        </a>
      ) : null}
      {digits ? (
        <a href={`tel:+${digits}`} className={adminButton({ variant: "secondary", size })}>
          <Phone aria-hidden="true" /> Call
        </a>
      ) : null}
      {email ? (
        <a
          href={`mailto:${email}?subject=${encodeURIComponent(emailSubject ?? "Re: your enquiry — Ishita Traders")}`}
          className={adminButton({ variant: "secondary", size })}
        >
          <Mail aria-hidden="true" /> Email
        </a>
      ) : null}
    </div>
  );
}
