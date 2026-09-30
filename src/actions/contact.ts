"use server";

import { deliverContactMessage } from "@/lib/contact/delivery";
import { contactSchema } from "@/lib/contact/schema";
import { contactFields, HONEYPOT_FIELD, type ContactField, type ContactFormState } from "@/lib/contact/types";

const SUCCESS_MESSAGE = "Thank you! Your message has been sent — our team will get back to you shortly.";

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
    await deliverContactMessage(parsed.data);
  } catch (error) {
    console.error("[contact] Failed to deliver enquiry", error);
    return {
      status: "error",
      message: "We couldn’t send your message right now.",
      values,
    };
  }

  return { status: "success", message: SUCCESS_MESSAGE };
}
