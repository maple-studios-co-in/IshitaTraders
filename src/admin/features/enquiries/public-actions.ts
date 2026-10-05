"use server";

import { headers } from "next/headers";
import { z } from "zod";

import { getCatalog } from "@/admin/content/catalog";
import { rfqFieldLabels, rfqFields, RFQ_HONEYPOT, type RfqField, type RfqFormState } from "@/admin/site/rfq";
import { getRequestMeta } from "@/admin/server/security/request";

import { EnquiryRateLimitError, parseUtm, recordEnquiry } from "./service";

const INDIAN_MOBILE = /^(?:\+?91|0)?[6-9]\d{9}$/;
const SUCCESS = "Thank you! Your enquiry reached our commercial desk — we’ll reply with dealer pricing shortly.";

const rfqSchema = z.object({
  company: z.string().trim().min(2, "Enter the company or institution name.").max(160, "That name is too long."),
  contactName: z.string().trim().min(2, "Enter the contact person’s name.").max(120, "That name is too long."),
  email: z.string().trim().toLowerCase().max(254).pipe(z.email("Enter a valid email address.")),
  phone: z
    .string()
    .trim()
    .transform((value) => value.replace(/[\s()-]/g, ""))
    .pipe(z.string().regex(INDIAN_MOBILE, "Enter a valid 10-digit mobile number.")),
  quantity: z.coerce
    .number({ error: "Enter the number of units." })
    .int("Use a whole number.")
    .min(1, "At least 1 unit.")
    .max(100000, "For orders above 1,00,000 units, call us directly."),
  application: z
    .string()
    .trim()
    .min(10, "Tell us a little about the site and delivery (at least 10 characters).")
    .max(2000, "Keep it under 2000 characters."),
});

/** Products page → product details → RFQ form. Stored as a "Product enquiry / RFQ" enquiry. */
export async function submitProductRfq(_previous: RfqFormState, formData: FormData): Promise<RfqFormState> {
  if (String(formData.get(RFQ_HONEYPOT) ?? "").trim() !== "") return { status: "success", message: SUCCESS };

  const values = Object.fromEntries(rfqFields.map((field) => [field, String(formData.get(field) ?? "")])) as Record<
    RfqField,
    string
  >;
  const parsed = rfqSchema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<RfqField, string>> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as RfqField | undefined;
      if (field && !fieldErrors[field]) fieldErrors[field] = issue.message;
    }
    return { status: "error", message: "Please check the highlighted fields.", fieldErrors, values };
  }

  const slug = String(formData.get("productSlug") ?? "");
  const product = (await getCatalog()).products.find((item) => item.slug === slug);

  try {
    const data = parsed.data;
    const [meta, requestHeaders] = await Promise.all([getRequestMeta(), headers()]);
    await recordEnquiry(
      {
        formKey: "product-rfq",
        name: data.contactName,
        email: data.email,
        phone: data.phone,
        company: data.company,
        message: data.application,
        fields: [
          ...(product
            ? [
                { key: "product", label: "Product", value: product.name },
                { key: "sku", label: "SKU", value: product.sku },
              ]
            : []),
          ...rfqFields.map((key) => ({ key, label: rfqFieldLabels[key], value: String(data[key]) })),
        ],
        productId: product && !product.id.startsWith("seed:") ? product.id : null,
        productName: product?.name ?? "",
        pageUrl: requestHeaders.get("referer") ?? "",
        utm: parseUtm(formData.get("utm")),
      },
      { ...meta, referrer: String(formData.get("referrer") ?? "") },
    );
  } catch (error) {
    if (error instanceof EnquiryRateLimitError) return { status: "error", message: error.message, values };
    console.error("[rfq] Failed to record enquiry", error);
    return { status: "error", message: "We couldn’t send your enquiry right now. Please call or WhatsApp us.", values };
  }

  return { status: "success", message: SUCCESS };
}
