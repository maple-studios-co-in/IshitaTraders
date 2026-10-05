import type { SiteSettings } from "./settings-schema";

/** Contact links built from the editable contact settings (client-safe, no I/O). */
export function contactLinks(contact: SiteSettings["contact"]) {
  const whatsapp = (message: string = contact.whatsappMessage) =>
    `https://wa.me/${contact.whatsappNumber}?text=${encodeURIComponent(message)}`;
  return {
    phone: `tel:${contact.phoneE164}`,
    whatsapp,
    /** Pre-filled "price and availability" enquiry for a product or category. */
    enquiry: (subject: string) =>
      whatsapp(`Hi Ishita Traders, I would like the price and availability for ${subject}.`),
    mailto: (subject = "Enquiry from website") => `mailto:${contact.email}?subject=${encodeURIComponent(subject)}`,
  };
}

export type ContactLinks = ReturnType<typeof contactLinks>;

/**
 * A link stored in static content: a URL/path, or an intent resolved at render time from the
 * current contact settings — so changing the business number in the admin updates every button.
 */
export type LinkTarget = string | { kind: "whatsapp"; message?: string } | { kind: "enquiry"; subject: string };

export function resolveLink(target: LinkTarget, links: ContactLinks): string {
  if (typeof target === "string") return target;
  return target.kind === "whatsapp" ? links.whatsapp(target.message) : links.enquiry(target.subject);
}
