import type { FigmaIconName } from "@/components/pages/figma-icons";

/** Contact page copy (Figma zj4F9WF6L3bOUAsZTbe9xJ, frame 285:169). Phone, email and address come from the admin. */
export const contactPage = {
  banner: "We’re here to help",
  eyebrow: "Contact Information",
  title: { lead: "Let’s Build a ", accent: "Brighter Future", tail: " Together" },
  whatsapp: { title: "WhatsApp", subtitle: "Chat with us for quick enquiries.", cta: "Chat on WhatsApp" },
  mapsLabel: "Open in Google Maps",
  form: {
    title: "Send Us an Enquiry",
    subtitle: "Fill in the details and our team will get back to you soon.",
    submit: "Send Enquiry",
  },
  benefits: [
    { icon: "leaf", lines: ["Cleaner", "Environment"] },
    { icon: "coins", lines: ["Lower", "Electricity Bills"] },
    { icon: "bolt", lines: ["Reliable", "Power Supply"] },
  ] satisfies { icon: FigmaIconName; lines: [string, string] }[],
};

/** "Enquiry Type" choices: the value is what the team sees in Admin → Enquiries. */
export const enquiryTypes = [
  { value: "Solar", icon: "sun", tint: "bg-[#fffbeb]" },
  { value: "Battery", icon: "battery", tint: "bg-[#fef2f2]" },
  { value: "Inverter / UPS", icon: "ups", tint: "bg-[#eff6ff]" },
  { value: "Electrical Products", icon: "plug", tint: "bg-[#eff6ff]" },
  { value: "Bulk Supply", icon: "box", tint: "bg-[#fffbeb]" },
  { value: "General Enquiry", icon: "message", tint: "bg-[#eff6ff]" },
] as const satisfies readonly { value: string; icon: FigmaIconName; tint: string }[];

export type EnquiryType = (typeof enquiryTypes)[number]["value"];
