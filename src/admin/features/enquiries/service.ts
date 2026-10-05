import "server-only";

import { after } from "next/server";

import { siteForms, type FormKey } from "@/admin/config/forms";
import type { EnquiryField, Utm } from "@/admin/content/types";
import { getDb } from "@/admin/server/db/client";
import { enquiries } from "@/admin/server/db/schema";
import { sendAdminEmail, sendWebhook } from "@/admin/server/notify";
import { rateLimit } from "@/admin/server/security/rate-limit";
import { hashIp, type RequestMeta } from "@/admin/server/security/request";
import { siteConfig } from "@/config/site";

export class EnquiryRateLimitError extends Error {
  constructor() {
    super("You’ve sent several enquiries in a short time. Please wait a few minutes, or call/WhatsApp us directly.");
    this.name = "EnquiryRateLimitError";
  }
}

export interface EnquiryInput {
  formKey: FormKey;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  message?: string;
  /** Every field the visitor filled in, in form order, with human labels. */
  fields: EnquiryField[];
  productId?: string | null;
  productName?: string;
  pageUrl?: string;
  utm?: Utm;
}

/**
 * Stores a website enquiry and, after the response is sent, notifies the team by email (Resend)
 * and/or webhook when those are configured. Storage is the source of truth: a lead is never lost
 * because email is down.
 */
export async function recordEnquiry(input: EnquiryInput, meta: RequestMeta & { referrer?: string }) {
  const ipHash = hashIp(meta.ip);
  const limit = await rateLimit(`enquiry:${input.formKey}:${ipHash || "unknown"}`, 5, 10 * 60);
  if (!limit.ok) throw new EnquiryRateLimitError();

  const form = siteForms[input.formKey];
  const db = await getDb();
  const [row] = await db
    .insert(enquiries)
    .values({
      formKey: input.formKey,
      formName: form.name,
      name: input.name.slice(0, 160),
      email: input.email?.slice(0, 254) ?? "",
      phone: input.phone?.slice(0, 30) ?? "",
      company: input.company?.slice(0, 200) ?? "",
      message: input.message?.slice(0, 4000) ?? "",
      fields: input.fields.map((field) => ({ ...field, value: field.value.slice(0, 4000) })),
      productId: input.productId ?? null,
      productName: input.productName ?? "",
      pageUrl: (input.pageUrl ?? "").slice(0, 500),
      referrer: (meta.referrer ?? "").slice(0, 500),
      utm: input.utm ?? {},
      userAgent: meta.userAgent,
      ipHash,
    })
    .returning({ id: enquiries.id, createdAt: enquiries.createdAt });

  after(async () => {
    const lines = input.fields.map((field) => `${field.label}: ${field.value || "—"}`);
    const adminUrl = `${siteConfig.url}/admin/enquiries/${row.id}`;
    await Promise.all([
      sendAdminEmail({
        subject: `New ${form.name.toLowerCase()} from ${input.name}${input.productName ? ` — ${input.productName}` : ""}`,
        text: [
          `A new enquiry arrived through the ${form.name} on the website.`,
          "",
          ...lines,
          "",
          `Open in the admin: ${adminUrl}`,
        ].join("\n"),
        replyTo: input.email || undefined,
      }),
      sendWebhook("enquiry.created", {
        id: row.id,
        form: input.formKey,
        formName: form.name,
        name: input.name,
        email: input.email ?? "",
        phone: input.phone ?? "",
        company: input.company ?? "",
        product: input.productName ?? "",
        fields: input.fields,
        adminUrl,
      }),
    ]);
  });

  return row;
}

/** UTM parameters posted by the public forms (hidden input filled from the visitor's session). */
export function parseUtm(raw: FormDataEntryValue | null): Utm {
  if (typeof raw !== "string" || raw.length > 1000) return {};
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    const utm: Utm = {};
    for (const key of ["source", "medium", "campaign", "term", "content"] as const) {
      if (typeof value[key] === "string") utm[key] = (value[key] as string).slice(0, 100);
    }
    return utm;
  } catch {
    return {};
  }
}
