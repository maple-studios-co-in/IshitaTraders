import "server-only";

import { getSiteSettings } from "@/admin/content/settings";

import { env } from "./env";

const TIMEOUT_MS = 8000;

export interface AdminEmail {
  subject: string;
  text: string;
  replyTo?: string;
}

/** Whether new-lead emails can be sent (Resend key + verified sender configured). */
export function isEmailConfigured() {
  return Boolean(env.resendApiKey && env.contactFromEmail);
}

/** Recipients: Admin → Settings → Notifications, falling back to CONTACT_TO_EMAIL. */
async function recipients() {
  const { notifications } = await getSiteSettings();
  const list = notifications.enquiryEmails.length > 0 ? notifications.enquiryEmails : env.contactToEmail.split(",");
  return list.map((email) => email.trim()).filter(Boolean);
}

/** Emails the team via Resend. Returns false (never throws) when email isn't configured or fails. */
export async function sendAdminEmail(email: AdminEmail): Promise<boolean> {
  if (!isEmailConfigured()) return false;
  const to = await recipients();
  if (to.length === 0) return false;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: env.contactFromEmail,
        to,
        subject: email.subject,
        text: email.text,
        ...(email.replyTo ? { reply_to: email.replyTo } : {}),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok)
      console.error("[notify] Resend responded", response.status, await response.text().catch(() => ""));
    return response.ok;
  } catch (error) {
    console.error("[notify] email failed", error);
    return false;
  }
}

/** POSTs a JSON event to CONTACT_WEBHOOK_URL (Zapier, Make, Google Apps Script, a CRM…). */
export async function sendWebhook(event: string, payload: Record<string, unknown>): Promise<boolean> {
  if (!env.contactWebhookUrl) return false;
  try {
    const response = await fetch(env.contactWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, ...payload, sentAt: new Date().toISOString() }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return response.ok;
  } catch (error) {
    console.error("[notify] webhook failed", error);
    return false;
  }
}
