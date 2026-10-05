import "server-only";

import { env } from "@/admin/server/env";
import { rateLimit } from "@/admin/server/security/rate-limit";
import { hashIp, metaFromHeaders } from "@/admin/server/security/request";

import {
  BODY_LIMITS,
  MAX_BATCH,
  decodeUtf8,
  isAuthorized,
  isBotUserAgent,
  parseInboundEmail,
  parseJson,
  parseSmsPayload,
  parseTrackBeacon,
  parseWebhookBody,
  parseWhatsAppPayload,
  readBodyLimited,
  safeEqual,
  verifyMetaSignature,
  type IncomingMessage,
  type ParseResult,
} from "./ingest";
import { ingestMessages, recordLeadEvent } from "./service";

/**
 * HTTP glue for the inbox endpoints (`app/api/track`, `app/api/webhooks/*`): size limits, rate
 * limits, authentication, then parse (`ingest.ts`) and store (`service.ts`). Bad input is a 4xx,
 * never a 500; storage failures are a 503 so providers retry later.
 */

const NO_STORE = { "Cache-Control": "no-store" };

const empty = (status: number, headers: Record<string, string> = {}) =>
  new Response(null, { status, headers: { ...NO_STORE, ...headers } });

const text = (status: number, body: string) =>
  new Response(body, { status, headers: { ...NO_STORE, "Content-Type": "text/plain; charset=utf-8" } });

const json = (status: number, body: Record<string, unknown>) => Response.json(body, { status, headers: NO_STORE });

/** 429 with a Retry-After matching the rate-limit window. */
function withRetry(resetAt: Date) {
  const seconds = Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 1000));
  return new Response("Too many requests.", {
    status: 429,
    headers: { ...NO_STORE, "Content-Type": "text/plain; charset=utf-8", "Retry-After": String(seconds) },
  });
}

/** Per-IP fixed window; returns the 429 response when the caller is over the limit. */
async function limitByIp(scope: string, ip: string, limit: number, windowSeconds = 60) {
  const result = await rateLimit(`${scope}:${hashIp(ip) || "unknown"}`, limit, windowSeconds);
  return result.ok ? null : withRetry(result.resetAt);
}

function failure(scope: string, error: unknown) {
  console.error(`[${scope}]`, error);
  return text(503, "Temporarily unavailable. Please retry.");
}

/* ----------------------------------------------------------- /api/track */

/** Website contact-button clicks (sent with `navigator.sendBeacon` as text/plain JSON). */
export async function handleTrackBeacon(request: Request): Promise<Response> {
  try {
    const visitor = metaFromHeaders(request.headers);
    // Crawlers and other sites' pages posting here are dropped silently.
    if (isBotUserAgent(visitor.userAgent) || request.headers.get("sec-fetch-site") === "cross-site") return empty(204);

    const bytes = await readBodyLimited(request, BODY_LIMITS.track);
    if (!bytes) return text(413, "Payload too large.");

    const ipHash = hashIp(visitor.ip);
    const limit = await rateLimit(`track:${ipHash || "unknown"}`, 60, 60);
    if (!limit.ok) return withRetry(limit.resetAt);

    const parsed = parseTrackBeacon(decodeUtf8(bytes));
    if (!parsed.ok) return text(400, parsed.error);

    await recordLeadEvent(parsed.beacon, { userAgent: visitor.userAgent, ipHash });
    return empty(204);
  } catch (error) {
    return failure("track", error);
  }
}

/* ------------------------------------------------- /api/webhooks/whatsapp */

/** Meta's subscription check: echo `hub.challenge` when `hub.verify_token` matches. */
export async function handleWhatsAppVerification(request: Request): Promise<Response> {
  try {
    const limited = await limitByIp("webhook:whatsapp-verify", metaFromHeaders(request.headers).ip, 30);
    if (limited) return limited;
    const params = new URL(request.url).searchParams;
    const expected = env.whatsappVerifyToken;
    const challenge = params.get("hub.challenge") ?? "";
    const valid =
      params.get("hub.mode") === "subscribe" &&
      Boolean(expected) &&
      safeEqual(params.get("hub.verify_token") ?? "", expected) &&
      /^[\w.-]{1,256}$/.test(challenge);
    return valid ? text(200, challenge) : text(403, "Verification failed.");
  } catch (error) {
    return failure("webhook:whatsapp", error);
  }
}

/** WhatsApp Cloud API notifications, signed with the Meta app secret. */
export async function handleWhatsAppWebhook(request: Request): Promise<Response> {
  try {
    const limited = await limitByIp("webhook:whatsapp", metaFromHeaders(request.headers).ip, 600);
    if (limited) return limited;

    const bytes = await readBodyLimited(request, BODY_LIMITS.webhook);
    if (!bytes) return text(413, "Payload too large.");

    const secret = env.whatsappAppSecret;
    if (secret) {
      if (!verifyMetaSignature(bytes, request.headers.get("x-hub-signature-256"), secret))
        return text(401, "Invalid signature.");
    } else if (env.isProduction) {
      console.error("[webhook:whatsapp] WHATSAPP_APP_SECRET is not set — rejecting an unverifiable webhook.");
      return text(503, "WhatsApp webhook is not configured.");
    } else {
      console.warn(
        "[webhook:whatsapp] WHATSAPP_APP_SECRET is not set — accepting an unsigned webhook (development only).",
      );
    }

    const payload = parseJson(decodeUtf8(bytes));
    if (payload === undefined || payload === null || typeof payload !== "object") return text(400, "Invalid JSON.");

    const result = await ingestMessages(parseWhatsAppPayload(payload));
    return json(200, { ok: true, ...result });
  } catch (error) {
    return failure("webhook:whatsapp", error);
  }
}

/* --------------------------------------------- email & SMS shared plumbing */

interface SecretWebhook {
  scope: string;
  secret: string;
  notConfigured: string;
  maxBytes: number;
  parse: (payload: unknown) => ParseResult;
}

/** Rate limit → secret → size → parse (single object or a batch array) → store. */
async function receiveSecretWebhook(
  request: Request,
  config: SecretWebhook,
): Promise<Response | { stored: number; duplicates: number }> {
  const limited = await limitByIp(config.scope, metaFromHeaders(request.headers).ip, 120);
  if (limited) return limited;
  if (!config.secret) return text(503, config.notConfigured);
  if (!isAuthorized(request.headers, request.url, config.secret)) return text(401, "Unauthorized.");

  const bytes = await readBodyLimited(request, config.maxBytes);
  if (!bytes) return text(413, "Payload too large.");
  const payload = await parseWebhookBody(bytes, request.headers.get("content-type"));
  if (payload === undefined || payload === null || typeof payload !== "object")
    return text(400, "Unsupported or invalid body.");

  const results = (Array.isArray(payload) ? payload.slice(0, MAX_BATCH) : [payload]).map((item) => config.parse(item));
  const messages = results.flatMap((result): IncomingMessage[] => (result.ok ? [result.message] : []));
  if (messages.length === 0) {
    const error = results.find((result) => !result.ok);
    return text(400, error && !error.ok ? error.error : "Nothing to store.");
  }
  return ingestMessages(messages);
}

/* ---------------------------------------------------- /api/webhooks/email */

/** Inbound email: Postmark, CloudMailin (JSON), Mailgun/SendGrid (forms) or the generic JSON shape. */
export async function handleInboundEmail(request: Request): Promise<Response> {
  try {
    const result = await receiveSecretWebhook(request, {
      scope: "webhook:email",
      secret: env.inboundEmailSecret,
      notConfigured: "Inbound email is not configured (INBOUND_EMAIL_SECRET).",
      maxBytes: BODY_LIMITS.email,
      parse: (payload) => parseInboundEmail(payload),
    });
    return result instanceof Response ? result : json(200, { ok: true, ...result });
  } catch (error) {
    return failure("webhook:email", error);
  }
}

/* ------------------------------------------------------ /api/webhooks/sms */

const EMPTY_TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';

/** SMS and call events: Twilio-style form posts (answered with empty TwiML) or JSON. */
export async function handleSmsWebhook(request: Request): Promise<Response> {
  try {
    const result = await receiveSecretWebhook(request, {
      scope: "webhook:sms",
      secret: env.smsWebhookSecret,
      notConfigured: "SMS webhook is not configured (SMS_WEBHOOK_SECRET).",
      maxBytes: BODY_LIMITS.webhook,
      parse: (payload) => parseSmsPayload(payload),
    });
    if (result instanceof Response) return result;
    const formPost = (request.headers.get("content-type") ?? "")
      .toLowerCase()
      .startsWith("application/x-www-form-urlencoded");
    return formPost
      ? new Response(EMPTY_TWIML, { status: 200, headers: { ...NO_STORE, "Content-Type": "text/xml; charset=utf-8" } })
      : json(200, { ok: true, ...result });
  } catch (error) {
    return failure("webhook:sms", error);
  }
}
