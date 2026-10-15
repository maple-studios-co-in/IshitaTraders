"use server";

import { headers } from "next/headers";

import { EnquiryRateLimitError, parseUtm, recordEnquiry } from "@/admin/features/enquiries/service";
import { getRequestMeta } from "@/admin/server/security/request";
import { enquirySchema } from "@/lib/contact/schema";
import { HONEYPOT_FIELD } from "@/lib/contact/types";

const fieldLabels = { name: "Name", phone: "Phone number", interest: "Interested in", message: "Message" } as const;

/**
 * The enquiry form opens WhatsApp in the visitor's browser; this keeps a copy in Admin → Enquiries
 * ("Contact form", with the usual team notification) so a lead is never lost when the visitor
 * doesn't press send. The form says so under its button.
 */
export async function recordWhatsAppEnquiry(formData: FormData): Promise<{ ok: boolean }> {
  // Bots fill every field; pretend success so they don't retry.
  if (String(formData.get(HONEYPOT_FIELD) ?? "").trim() !== "") return { ok: true };

  const parsed = enquirySchema.safeParse({
    name: String(formData.get("name") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    interest: String(formData.get("interest") ?? ""),
    message: String(formData.get("message") ?? ""),
  });
  if (!parsed.success) return { ok: false };

  const enquiry = parsed.data;
  try {
    const [meta, requestHeaders] = await Promise.all([getRequestMeta(), headers()]);
    await recordEnquiry(
      {
        formKey: "contact",
        name: enquiry.name,
        phone: enquiry.phone,
        message: [enquiry.interest && `Interested in: ${enquiry.interest}`, enquiry.message]
          .filter(Boolean)
          .join("\n\n"),
        fields: (Object.keys(fieldLabels) as (keyof typeof fieldLabels)[])
          .filter((key) => enquiry[key])
          .map((key) => ({ key, label: fieldLabels[key], value: enquiry[key] })),
        pageUrl: requestHeaders.get("referer") ?? "",
        utm: parseUtm(formData.get("utm")),
      },
      { ...meta, referrer: String(formData.get("referrer") ?? "") },
    );
    return { ok: true };
  } catch (error) {
    if (!(error instanceof EnquiryRateLimitError)) console.error("[enquiry] Failed to record enquiry", error);
    return { ok: false };
  }
}
