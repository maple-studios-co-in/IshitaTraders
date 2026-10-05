"use server";

import { headers } from "next/headers";

import { EnquiryRateLimitError, parseUtm, recordEnquiry } from "@/admin/features/enquiries/service";
import { getRequestMeta } from "@/admin/server/security/request";
import { contactSchema } from "@/lib/contact/schema";
import { contactFields, HONEYPOT_FIELD, type ContactField, type ContactFormState } from "@/lib/contact/types";

const SUCCESS_MESSAGE = "Thank you! Your message has been sent — our team will get back to you shortly.";

const fieldLabels: Record<ContactField, string> = {
  firstName: "First name",
  lastName: "Last name",
  email: "Email address",
  phone: "Phone number",
  message: "Message",
};

/** Homepage contact form → stored as a "Contact form" enquiry in Admin → Enquiries (+ team notification). */
export async function submitContactForm(_previous: ContactFormState, formData: FormData): Promise<ContactFormState> {
  // Bots fill every field; pretend success so they don't retry.
  if (String(formData.get(HONEYPOT_FIELD) ?? "").trim() !== "") {
    return { status: "success", message: SUCCESS_MESSAGE };
  }

  const values = Object.fromEntries(contactFields.map((field) => [field, String(formData.get(field) ?? "")])) as Record<
    ContactField,
    string
  >;

  const parsed = contactSchema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<ContactField, string>> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as ContactField | undefined;
      if (field && !fieldErrors[field]) fieldErrors[field] = issue.message;
    }
    return { status: "error", message: "Please check the highlighted fields.", fieldErrors, values };
  }

  try {
    const message = parsed.data;
    const [meta, requestHeaders] = await Promise.all([getRequestMeta(), headers()]);
    await recordEnquiry(
      {
        formKey: "contact",
        name: [message.firstName, message.lastName].filter(Boolean).join(" "),
        email: message.email,
        phone: message.phone,
        message: message.message,
        fields: contactFields.map((key) => ({ key, label: fieldLabels[key], value: message[key] })),
        pageUrl: requestHeaders.get("referer") ?? "",
        utm: parseUtm(formData.get("utm")),
      },
      { ...meta, referrer: String(formData.get("referrer") ?? "") },
    );
  } catch (error) {
    if (error instanceof EnquiryRateLimitError) return { status: "error", message: error.message, values };
    console.error("[contact] Failed to record enquiry", error);
    return { status: "error", message: "We couldn’t send your message right now.", values };
  }

  return { status: "success", message: SUCCESS_MESSAGE };
}
