import { handleInboundEmail } from "@/admin/features/inbox/handlers";

/** Inbound email webhook (Postmark, CloudMailin, Mailgun, SendGrid or a Cloudflare Email Worker). */
export async function POST(request: Request) {
  return handleInboundEmail(request);
}
