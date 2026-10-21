/**
 * Optional outgoing webhook (e.g. Zapier or Make, to email the team, add a Google Sheets row or a
 * CRM lead). Best effort: the enquiry is already stored, so delivery problems are logged, never
 * thrown. With ENQUIRY_WEBHOOK_SECRET set, the body is signed (header X-Signature-256) so the
 * receiver can check it really came from this API.
 */
import { createHmac } from "node:crypto";

import { env } from "../config/env.js";
import { logger } from "./logger.js";

export async function sendWebhook(event, data) {
  if (!env.ENQUIRY_WEBHOOK_URL) return;

  const body = JSON.stringify({ event, data, sentAt: new Date().toISOString() });
  const headers = { "content-type": "application/json", "user-agent": "ishita-traders-api" };
  if (env.ENQUIRY_WEBHOOK_SECRET) {
    const signature = createHmac("sha256", env.ENQUIRY_WEBHOOK_SECRET).update(body).digest("hex");
    headers["x-signature-256"] = `sha256=${signature}`;
  }

  try {
    const response = await fetch(env.ENQUIRY_WEBHOOK_URL, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) logger.warn({ event, status: response.status }, "webhook was rejected");
  } catch (error) {
    logger.warn({ event, err: error }, "webhook could not be delivered");
  }
}
