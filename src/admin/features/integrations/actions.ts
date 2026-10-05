"use server";

import { getSiteSettings } from "@/admin/content/settings";
import type { ActionState } from "@/admin/lib/action-state";
import { FormError, runAction } from "@/admin/server/action";
import { logActivity } from "@/admin/server/audit";
import { assertPermission } from "@/admin/server/auth/guard";
import { env } from "@/admin/server/env";
import { isEmailConfigured, sendAdminEmail } from "@/admin/server/notify";
import { rateLimit } from "@/admin/server/security/rate-limit";
import { siteConfig } from "@/config/site";

/** Emails the notification recipients through Resend and reports what happened. */
export async function sendTestEmail(state: ActionState): Promise<ActionState> {
  void state;
  return runAction(async () => {
    const user = await assertPermission("integrations:manage");
    if (!isEmailConfigured()) {
      throw new FormError(
        "Email isn’t configured yet. Set RESEND_API_KEY and CONTACT_FROM_EMAIL (a sender on a domain verified in Resend) in the environment, then redeploy.",
      );
    }

    const { notifications } = await getSiteSettings();
    const recipients = (
      notifications.enquiryEmails.length > 0 ? notifications.enquiryEmails : env.contactToEmail.split(",")
    )
      .map((email) => email.trim())
      .filter(Boolean);
    if (recipients.length === 0)
      throw new FormError(
        "There’s nobody to send to: add an address under Settings → Notifications (or set CONTACT_TO_EMAIL).",
      );

    const limit = await rateLimit(`test-email:${user.id}`, 5, 10 * 60);
    if (!limit.ok)
      throw new FormError(
        "You’ve sent several test emails in the last few minutes. Please wait a little and try again.",
      );

    const sent = await sendAdminEmail({
      subject: `Test email from the ${siteConfig.name} admin`,
      text: [
        `This is a test sent by ${user.name} from Admin → Integrations.`,
        "",
        "If you can read this, new-enquiry and inbox notifications will reach this address.",
        `Admin: ${siteConfig.url}/admin`,
      ].join("\n"),
    });

    await logActivity(user, {
      action: "integrations.test_email",
      entityType: "integration",
      entityId: "email",
      summary: sent ? `Sent a test email to ${recipients.join(", ")}` : "A test email failed to send",
    });

    if (!sent) {
      throw new FormError(
        "Resend didn’t accept the email. Check the API key and that the sender’s domain is verified in Resend — the server log has the details.",
      );
    }
    return `Test email sent to ${recipients.join(", ")}. Check the inbox (and spam folder).`;
  });
}
