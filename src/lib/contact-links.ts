import { siteConfig } from "@/config/site";

/** Builds a click-to-chat WhatsApp link with an optional pre-filled message. */
export function whatsappHref(message: string = siteConfig.whatsapp.defaultMessage) {
  const text = encodeURIComponent(message);
  return `https://wa.me/${siteConfig.whatsapp.number}?text=${text}`;
}

/** Pre-filled enquiry for a specific product or service. */
export function enquiryHref(subject: string) {
  return whatsappHref(`Hi Ishita Traders, I would like the price and availability for ${subject}.`);
}

export const phoneHref = siteConfig.phone.href;

export function mailtoHref(subject = "Enquiry from website") {
  return `mailto:${siteConfig.email}?subject=${encodeURIComponent(subject)}`;
}
