/**
 * Business rules for new enquiries, kept apart from HTTP so they read on their own:
 * spam check, product lookup, the field list the admin displays, storing, and the notification.
 */
import { randomUUID } from "node:crypto";

import { badRequest } from "../../lib/errors.js";
import { hashIp } from "../../lib/ip-hash.js";
import { logger } from "../../lib/logger.js";
import { sendWebhook } from "../../lib/webhook.js";
import * as enquiries from "./enquiries.repository.js";

/** How API enquiries are labelled in the admin (it lists every form key it finds). */
export const API_FORM = { key: "api", name: "API enquiry" };

/**
 * @param {object} input validated request body (see createEnquiryBody)
 * @param {{ ip: string, userAgent: string, referrer: string }} meta
 */
export async function createEnquiry(input, meta) {
  // A filled-in honeypot means a bot. Answer exactly like a success so it learns nothing.
  if (input.website) {
    logger.info("enquiry honeypot triggered; not stored");
    return { id: randomUUID(), createdAt: new Date() };
  }

  const product = input.productSlug ? await enquiries.findPublishedProduct(input.productSlug) : null;
  if (input.productSlug && !product) {
    throw badRequest("unknown_product", "No published product has that productSlug.", [
      { in: "body", field: "productSlug", message: "Unknown product." },
    ]);
  }

  // Every answer with a human label, in form order: the admin shows exactly this list.
  const fields = [
    { key: "name", label: "Name", value: input.name },
    { key: "phone", label: "Phone", value: input.phone },
    { key: "email", label: "Email", value: input.email },
    { key: "company", label: "Company", value: input.company },
    { key: "subject", label: "Enquiry type", value: input.subject },
    { key: "product", label: "Product", value: product?.name },
    { key: "message", label: "Message", value: input.message },
  ].filter((field) => field.value);

  const row = await enquiries.insertEnquiry({
    formKey: API_FORM.key,
    formName: API_FORM.name,
    name: input.name,
    email: input.email ?? "",
    phone: input.phone,
    company: input.company ?? "",
    // Same convention as the website's contact page: the type leads the message.
    message: input.subject ? `${input.subject}: ${input.message}` : input.message,
    fields,
    productId: product?.id ?? null,
    productName: product?.name ?? "",
    pageUrl: input.pageUrl ?? "",
    referrer: meta.referrer.slice(0, 500),
    utm: input.utm ?? {},
    userAgent: meta.userAgent.slice(0, 500),
    ipHash: hashIp(meta.ip),
  });

  // Not awaited: the visitor gets their answer now; the notification follows in the background.
  void sendWebhook("enquiry.created", {
    id: row.id,
    form: API_FORM.key,
    formName: API_FORM.name,
    name: input.name,
    phone: input.phone,
    email: input.email ?? "",
    company: input.company ?? "",
    subject: input.subject ?? "",
    product: product?.name ?? "",
    message: input.message,
    fields,
    createdAt: row.created_at,
  });

  return { id: row.id, createdAt: row.created_at };
}
