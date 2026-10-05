import { handleSmsWebhook } from "@/admin/features/inbox/handlers";

/** SMS and phone-call webhook (Twilio, Exotel, MSG91, IVR missed-call alerts…). */
export async function POST(request: Request) {
  return handleSmsWebhook(request);
}
