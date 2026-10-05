import { handleWhatsAppVerification, handleWhatsAppWebhook } from "@/admin/features/inbox/handlers";

/** WhatsApp Cloud API webhook: GET = Meta's subscription check, POST = incoming messages. */
export async function GET(request: Request) {
  return handleWhatsAppVerification(request);
}

export async function POST(request: Request) {
  return handleWhatsAppWebhook(request);
}
