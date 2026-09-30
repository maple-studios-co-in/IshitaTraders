import "server-only";

import { siteConfig } from "@/config/site";

import type { ContactMessage } from "./schema";

export class ContactDeliveryError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ContactDeliveryError";
  }
}

const REQUEST_TIMEOUT_MS = 8000;

function formatPlainText(message: ContactMessage) {
  return [
    `New enquiry from the ${siteConfig.name} website`,
    "",
    `Name:    ${[message.firstName, message.lastName].filter(Boolean).join(" ")}`,
    `Email:   ${message.email}`,
    `Phone:   ${message.phone}`,
    "",
    "Message:",
    message.message,
  ].join("\n");
}

async function sendWithResend(message: ContactMessage, apiKey: string, from: string, to: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: to.split(",").map((address) => address.trim()),
      reply_to: message.email,
      subject: `Website enquiry — ${message.firstName} ${message.lastName}`.trim(),
      text: formatPlainText(message),
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new ContactDeliveryError(`Resend responded with ${response.status}`);
  }
}

async function sendToWebhook(message: ContactMessage, url: string) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...message, source: siteConfig.url, submittedAt: new Date().toISOString() }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new ContactDeliveryError(`Webhook responded with ${response.status}`);
  }
}

/**
 * Delivers a validated enquiry. Configure one of:
 * - RESEND_API_KEY + CONTACT_FROM_EMAIL + CONTACT_TO_EMAIL (email via Resend)
 * - CONTACT_WEBHOOK_URL (JSON POST to Zapier/Make/Google Apps Script/CRM)
 */
export async function deliverContactMessage(message: ContactMessage) {
  const { RESEND_API_KEY, CONTACT_FROM_EMAIL, CONTACT_TO_EMAIL, CONTACT_WEBHOOK_URL } = process.env;

  try {
    if (RESEND_API_KEY && CONTACT_FROM_EMAIL && CONTACT_TO_EMAIL) {
      await sendWithResend(message, RESEND_API_KEY, CONTACT_FROM_EMAIL, CONTACT_TO_EMAIL);
      return;
    }
    if (CONTACT_WEBHOOK_URL) {
      await sendToWebhook(message, CONTACT_WEBHOOK_URL);
      return;
    }
  } catch (error) {
    if (error instanceof ContactDeliveryError) throw error;
    throw new ContactDeliveryError("Contact delivery request failed", { cause: error });
  }

  if (process.env.NODE_ENV !== "production") {
    console.info(
      "[contact] No delivery channel configured — enquiry received in development:\n" + formatPlainText(message),
    );
    return;
  }

  throw new ContactDeliveryError("No contact delivery channel is configured");
}
