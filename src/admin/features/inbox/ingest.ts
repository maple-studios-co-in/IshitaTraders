/**
 * Inbox ingestion: parsing and normalising everything that arrives from outside — website click
 * beacons, WhatsApp Cloud API webhooks, inbound email (Postmark, CloudMailin, Mailgun/SendGrid-style
 * forms, or a plain JSON shape) and SMS / call webhooks (Twilio-style forms or JSON).
 *
 * Pure functions only: no database, no Next.js, no environment access — so every rule here can be
 * unit-tested with plain inputs. Route handlers (`handlers.ts`) do the HTTP work and `service.ts`
 * does the database writes.
 */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { z } from "zod";

import { leadEventTypes, type MessageChannel, type MessageDirection, type Utm } from "@/admin/content/types";

/* ----------------------------------------------------------------- limits */

export const BODY_LIMITS = {
  /** Click beacons are tiny JSON documents. */
  track: 8 * 1024,
  /** WhatsApp and SMS/call webhooks. */
  webhook: 1024 * 1024,
  /**
   * Inbound email providers inline attachments as base64, so a 1 MB cap would bounce ordinary
   * emails with a photo. 4 MB stays under Vercel's 4.5 MB request-body ceiling.
   */
  email: 4 * 1024 * 1024,
} as const;

/** Most messages accepted from one webhook delivery. */
export const MAX_BATCH = 100;

const MAX = {
  name: 160,
  phone: 40,
  email: 254,
  subject: 300,
  body: 20_000,
  externalId: 300,
  meta: 16_000,
} as const;

/* -------------------------------------------------------------- the shape */

/** A message normalised for the `messages` table (source = webhook). */
export interface IncomingMessage {
  channel: MessageChannel;
  direction: MessageDirection;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  subject: string;
  body: string;
  /** Provider message id (makes retries idempotent); null when the provider sent none. */
  externalId: string | null;
  occurredAt: Date;
  meta: Record<string, unknown>;
}

export type ParseResult = { ok: true; message: IncomingMessage } | { ok: false; error: string };

/* ---------------------------------------------------------------- helpers */

type Rec = Record<string, unknown>;

const isRecord = (value: unknown): value is Rec => typeof value === "object" && value !== null && !Array.isArray(value);
const rec = (value: unknown): Rec | null => (isRecord(value) ? value : null);
const arr = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const recs = (value: unknown): Rec[] => arr(value).filter(isRecord);

const str = (value: unknown): string =>
  typeof value === "string" ? value : typeof value === "number" && Number.isFinite(value) ? String(value) : "";

const num = (value: unknown): number | null => {
  const n =
    typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : Number.NaN;
  return Number.isFinite(n) ? n : null;
};

/** Cuts a string without leaving half of a surrogate pair (emoji) at the end. */
export function truncate(value: string, max: number) {
  if (value.length <= max) return value;
  const cut = value.slice(0, max);
  const last = cut.charCodeAt(cut.length - 1);
  return last >= 0xd800 && last <= 0xdbff ? cut.slice(0, -1) : cut;
}

// NUL and other C0 control characters (PostgreSQL rejects NUL in text and jsonb); keeps \t \n \r.
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** Multi-line text: control characters removed, newlines normalised, trimmed and capped. */
export function cleanText(value: unknown, max: number) {
  return truncate(str(value).replace(CONTROL_CHARS, "").replace(/\r\n?/g, "\n").trim(), max);
}

/** Single-line text: like `cleanText`, with all whitespace runs collapsed to one space. */
export function cleanLine(value: unknown, max: number) {
  return truncate(str(value).replace(CONTROL_CHARS, "").replace(/\s+/g, " ").trim(), max);
}

const UNSAFE_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const SECRET_KEYS = /secret|token|password|signature|auth/i;

/**
 * JSON-safe copy of untrusted data for the `meta` column: bounded depth/size, no NUL characters,
 * no prototype keys and nothing that looks like a credential.
 */
export function sanitizeJson(value: unknown, depth = 0): unknown {
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "string") return truncate(value.replace(CONTROL_CHARS, ""), 2000);
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (depth >= 6) return null;
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => sanitizeJson(item, depth + 1));
  if (isRecord(value)) {
    const out: Rec = {};
    let keys = 0;
    for (const [key, item] of Object.entries(value)) {
      if (item === undefined || UNSAFE_KEYS.has(key) || SECRET_KEYS.test(key)) continue;
      if (++keys > 60) break;
      out[truncate(key.replace(CONTROL_CHARS, ""), 100)] = sanitizeJson(item, depth + 1);
    }
    return out;
  }
  return null;
}

/** Meta for storage: sanitised, empty values dropped, and the raw payload removed if it's too big. */
export function sanitizeMeta(meta: Rec): Rec {
  const compact: Rec = {};
  for (const [key, value] of Object.entries(meta)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value) && value.length === 0) continue;
    compact[key] = value;
  }
  let clean = (sanitizeJson(compact) as Rec | null) ?? {};
  if (JSON.stringify(clean).length > MAX.meta && "raw" in clean) {
    clean = { ...clean, raw: "[omitted: too large]" };
  }
  if (JSON.stringify(clean).length > MAX.meta) {
    clean = { provider: clean.provider ?? "", type: clean.type ?? "", truncated: true };
  }
  return clean;
}

/** Case-insensitive own-property lookup (provider field names vary in case). */
function lookup(data: Rec, key: string): unknown {
  if (Object.hasOwn(data, key)) return data[key];
  const wanted = key.toLowerCase();
  for (const [k, value] of Object.entries(data)) if (k.toLowerCase() === wanted) return value;
  return undefined;
}

/** First non-empty value among several possible field names. */
function pick(data: Rec, ...keys: string[]): unknown {
  for (const key of keys) {
    const value = lookup(data, key);
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

/** Header from `{name: value}` objects or `[{Name, Value}]` lists; `-`/`_`/case-insensitive. */
export function headerValue(headers: unknown, name: string): string {
  const wanted = name.toLowerCase().replace(/[-_]/g, "");
  const norm = (key: string) => key.toLowerCase().replace(/[-_]/g, "");
  if (Array.isArray(headers)) {
    for (const item of recs(headers)) {
      if (norm(str(item.Name ?? item.name)) === wanted) return str(item.Value ?? item.value);
    }
    return "";
  }
  const record = rec(headers);
  if (!record) return "";
  for (const [key, value] of Object.entries(record)) {
    if (norm(key) !== wanted) continue;
    return Array.isArray(value) ? str(value[0]) : str(value);
  }
  return "";
}

/** A stable id for providers that send none, so webhook retries don't create duplicates. */
export function contentKey(...parts: string[]) {
  return `sha256:${createHash("sha256").update(parts.join("\u0001")).digest("hex").slice(0, 40)}`;
}

/** Provider timestamps (seconds, milliseconds or date strings); nonsense falls back to `now`. */
export function parseDate(value: unknown, now = new Date()): Date {
  let date: Date | null = null;
  const n = num(value);
  if (n !== null && (typeof value === "number" || /^\d{9,13}$/.test(str(value).trim()))) {
    date = new Date(n < 1e12 ? n * 1000 : n);
  } else if (typeof value === "string" && value.trim()) {
    date = new Date(value.trim());
  }
  if (!date || Number.isNaN(date.getTime())) return now;
  if (date.getTime() < Date.UTC(2000, 0, 1) || date.getTime() > now.getTime() + 86_400_000) return now;
  return date;
}

/* ------------------------------------------------------- phones & emails */

/**
 * Phone numbers stored in one shape across channels: `+<country><number>` (Indian 10-digit and
 * 0-prefixed numbers get +91). Alphanumeric SMS sender IDs ("VM-ISHITA") are kept as sent.
 */
export function normalizePhone(raw: unknown) {
  const value = cleanLine(raw, 60).replace(/^(whatsapp|tel|sms|callto):/i, "");
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  if (/[a-z]/i.test(value) && digits.length < 8) return truncate(value, MAX.phone);
  if (!digits) return "";
  if (value.startsWith("+")) return `+${digits}`.slice(0, 20);
  if (digits.startsWith("00") && digits.length > 10) return `+${digits.slice(2)}`.slice(0, 20);
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `+91${digits.slice(1)}`;
  if (digits.length >= 11) return `+${digits}`.slice(0, 20);
  return digits;
}

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]+$/;

/** `"Ramesh Kumar" <ramesh@example.com>`, `ramesh@example.com (Ramesh)` or a bare address. */
export function parseAddress(raw: unknown): { name: string; email: string } {
  const value = cleanLine(Array.isArray(raw) ? raw[0] : raw, 600);
  if (!value) return { name: "", email: "" };
  let name = "";
  let email = value;
  const angled = /^(.*?)<\s*([^<>\s]+)\s*>\s*$/.exec(value);
  const commented = /^([^\s()]+@[^\s()]+)\s*\((.*)\)\s*$/.exec(value);
  if (angled) {
    name = angled[1]
      .trim()
      .replace(/^"(.*)"$/, "$1")
      .trim();
    email = angled[2];
  } else if (commented) {
    email = commented[1];
    name = commented[2].trim();
  } else if (value.includes(",")) {
    email = value.split(",")[0].trim();
  }
  email = email.replace(/^mailto:/i, "").toLowerCase();
  if (email.length > MAX.email || !EMAIL_RE.test(email)) email = "";
  return { name: truncate(name.replace(/\\(.)/g, "$1"), MAX.name), email };
}

/* ------------------------------------------------------------ HTML → text */

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  bull: "•",
  middot: "·",
  copy: "©",
  reg: "®",
  trade: "™",
  rupee: "₹",
  euro: "€",
  pound: "£",
  zwnj: "",
  zwj: "",
  shy: "",
};

export function decodeEntities(value: string) {
  return value.replace(/&(#\d{1,7}|#x[0-9a-f]{1,6}|[a-z][a-z0-9]{1,31});/gi, (match, entity: string) => {
    if (entity[0] === "#") {
      const code =
        entity[1] === "x" || entity[1] === "X"
          ? Number.parseInt(entity.slice(2), 16)
          : Number.parseInt(entity.slice(1), 10);
      const valid =
        code > 0 &&
        code <= 0x10ffff &&
        !(code >= 0xd800 && code <= 0xdfff) &&
        code !== 0x7f &&
        !(code < 32 && code !== 9 && code !== 10 && code !== 13);
      return valid ? String.fromCodePoint(code) : "";
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

/** Readable plain text from an HTML email body (scripts/styles dropped, block tags → newlines). */
export function htmlToText(html: string) {
  const input = truncate(html, 400_000);
  return decodeEntities(
    input
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<(script|style|head|title|template|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<li\b[^>]*>/gi, "\n• ")
      .replace(/<\/(p|div|li|tr|h[1-6]|blockquote|section|article|header|footer|table|ul|ol|pre)\s*>/gi, "\n")
      .replace(/<(td|th)\b[^>]*>/gi, " ")
      .replace(/<[^>]*>/g, ""),
  )
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/* ------------------------------------------------------- request bodies */

/**
 * Reads a request body up to `maxBytes`. Returns null when it's bigger (checked against the
 * declared Content-Length first, then while streaming, so a lying client can't exhaust memory).
 */
export async function readBodyLimited(request: Request, maxBytes: number): Promise<Uint8Array<ArrayBuffer> | null> {
  const declared = Number(request.headers.get("content-length") ?? "");
  if (Number.isFinite(declared) && declared > maxBytes) return null;
  if (!request.body) return new Uint8Array(0);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

/** UTF-8 (a leading BOM is dropped; invalid sequences become U+FFFD instead of throwing). */
export const decodeUtf8 = (bytes: Uint8Array) => new TextDecoder("utf-8").decode(bytes);

export function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

function paramsToRecord(params: URLSearchParams): Rec {
  const out: Rec = {};
  for (const [key, value] of params) {
    if (UNSAFE_KEYS.has(key) || Object.hasOwn(out, key)) continue;
    out[key] = value;
  }
  return out;
}

/**
 * Webhook body as data: JSON, `application/x-www-form-urlencoded` (Twilio, Exotel) or
 * `multipart/form-data` (SendGrid, Mailgun). Uploaded files are listed in `__files` (name, type,
 * size) — their contents are never kept. Returns undefined for unparseable bodies.
 */
export async function parseWebhookBody(bytes: Uint8Array<ArrayBuffer>, contentType: string | null): Promise<unknown> {
  const type = (contentType ?? "").split(";")[0].trim().toLowerCase();
  if (type === "application/x-www-form-urlencoded") return paramsToRecord(new URLSearchParams(decodeUtf8(bytes)));
  if (type === "multipart/form-data") {
    try {
      const form = await new Response(bytes, { headers: { "content-type": contentType ?? "" } }).formData();
      const out: Rec = {};
      const files: Rec[] = [];
      for (const [key, value] of form.entries()) {
        if (typeof value === "string") {
          if (!UNSAFE_KEYS.has(key) && !Object.hasOwn(out, key)) out[key] = value;
        } else if (files.length < 20) {
          files.push({ field: key, name: value.name, type: value.type, size: value.size });
        }
      }
      if (files.length > 0) out.__files = files;
      return out;
    } catch {
      return undefined;
    }
  }
  return parseJson(decodeUtf8(bytes));
}

/* ------------------------------------------------------------ webhook auth */

/** Constant-time string comparison (both sides hashed first, so lengths don't leak either). */
export function safeEqual(given: string, expected: string) {
  if (!given || !expected) return false;
  const a = createHash("sha256").update(given, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

/**
 * Secrets a webhook caller may present: `Authorization: Bearer <secret>`, HTTP Basic auth with the
 * secret as the password (`https://inbox:<secret>@host/...`, used by Postmark/CloudMailin), an
 * `X-Webhook-Secret` header, or a `?secret=` query parameter.
 */
export function presentedSecrets(headers: Headers, url: string): string[] {
  const found: string[] = [];
  const authorization = headers.get("authorization")?.trim() ?? "";
  const bearer = /^bearer\s+(\S+)$/i.exec(authorization);
  if (bearer) found.push(bearer[1]);
  const basic = /^basic\s+([a-z0-9+/=]+)$/i.exec(authorization);
  if (basic) {
    const decoded = Buffer.from(basic[1], "base64").toString("utf8");
    const colon = decoded.indexOf(":");
    if (colon >= 0) found.push(decoded.slice(colon + 1));
  }
  const header = headers.get("x-webhook-secret")?.trim();
  if (header) found.push(header);
  try {
    const query = new URL(url).searchParams.get("secret");
    if (query) found.push(query);
  } catch {
    // Unparseable URL: no query secret.
  }
  return found.map((secret) => secret.slice(0, 512));
}

export function isAuthorized(headers: Headers, url: string, secret: string) {
  return Boolean(secret) && presentedSecrets(headers, url).some((candidate) => safeEqual(candidate, secret));
}

/** Verifies Meta's `X-Hub-Signature-256: sha256=<hex>` — an HMAC of the raw body with the app secret. */
export function verifyMetaSignature(rawBody: Uint8Array | string, header: string | null, appSecret: string) {
  if (!header || !appSecret) return false;
  const match = /^sha256=([0-9a-f]{64})$/i.exec(header.trim());
  if (!match) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody).digest();
  const given = Buffer.from(match[1], "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** The header value Meta would send for `rawBody` (used by tests and local tooling). */
export function signMetaPayload(rawBody: Uint8Array | string, appSecret: string) {
  return `sha256=${createHmac("sha256", appSecret).update(rawBody).digest("hex")}`;
}

/* ---------------------------------------------------------- click beacons */

/** Obvious crawlers and link previewers (their "clicks" are never people). */
export function isBotUserAgent(userAgent: string) {
  const ua = userAgent.toLowerCase();
  if (/crawl|spider|slurp|facebookexternalhit|mediapartners/.test(ua)) return true;
  // "bot" anywhere (Googlebot, bingbot, AhrefsBot…), except the Cubot phone brand.
  return ua.replace(/cubot/g, "").includes("bot");
}

const beaconLine = (max: number) =>
  z
    .string()
    .max(max)
    .transform((value) => cleanLine(value, max))
    .default("");

const utmValue = z
  .string()
  .max(200)
  .transform((value) => cleanLine(value, 200))
  .optional();

/** What `site/lead-tracker.tsx` sends for every WhatsApp / call / email click. */
export const trackBeaconSchema = z.object({
  type: z.enum(leadEventTypes),
  context: beaconLine(120),
  target: beaconLine(200),
  message: z
    .string()
    .max(1000)
    .transform((value) => cleanText(value, 1000))
    .default(""),
  productSlug: beaconLine(200),
  path: z
    .string()
    .max(500)
    .refine(
      (value) => value === "" || (value.startsWith("/") && !value.startsWith("//") && !/[\s\\]/.test(value)),
      "path must be a site path",
    )
    .default(""),
  referrer: beaconLine(500),
  utm: z
    .object({ source: utmValue, medium: utmValue, campaign: utmValue, term: utmValue, content: utmValue })
    .default({}),
});

export type TrackBeacon = Omit<z.infer<typeof trackBeaconSchema>, "utm"> & { utm: Utm };

export function parseTrackBeacon(text: string): { ok: true; beacon: TrackBeacon } | { ok: false; error: string } {
  const json = parseJson(text);
  if (!isRecord(json)) return { ok: false, error: "Expected a JSON object." };
  const parsed = trackBeaconSchema.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: `Invalid ${issue?.path.join(".") || "payload"}.` };
  }
  const utm: Utm = {};
  for (const [key, value] of Object.entries(parsed.data.utm)) if (value) utm[key as keyof Utm] = value;
  return { ok: true, beacon: { ...parsed.data, utm } };
}

/* --------------------------------------------------------------- WhatsApp */

const WHATSAPP_MEDIA: Record<string, string> = {
  image: "Image",
  video: "Video",
  audio: "Audio",
  document: "Document",
  sticker: "Sticker",
};

/** Human-readable body + structured details for one WhatsApp Cloud API message. */
export function describeWhatsAppMessage(message: Rec): { type: string; body: string; meta: Rec } {
  const type = cleanLine(message.type, 40) || "unknown";
  switch (type) {
    case "text":
      return { type, body: str(rec(message.text)?.body), meta: {} };
    case "button": {
      const button = rec(message.button);
      return { type, body: str(button?.text), meta: { buttonPayload: str(button?.payload) } };
    }
    case "interactive": {
      const interactive = rec(message.interactive);
      const reply = rec(interactive?.button_reply) ?? rec(interactive?.list_reply);
      if (reply) {
        return {
          type,
          body: [str(reply.title), str(reply.description)].filter(Boolean).join(" — "),
          meta: { interactiveType: str(interactive?.type), replyId: str(reply.id) },
        };
      }
      const flow = rec(interactive?.nfm_reply);
      if (flow)
        return {
          type,
          body: str(flow.body) || "[Form reply]",
          meta: { interactiveType: "nfm_reply", response: str(flow.response_json) },
        };
      return { type, body: "[Interactive reply]", meta: { interactiveType: str(interactive?.type) } };
    }
    case "image":
    case "video":
    case "audio":
    case "document":
    case "sticker": {
      const media = rec(message[type]) ?? {};
      const label = type === "audio" && media.voice === true ? "Voice note" : WHATSAPP_MEDIA[type];
      const filename = str(media.filename);
      const caption = str(media.caption);
      const details = [filename, caption].filter(Boolean).join(" — ");
      return {
        type,
        body: `[${label}]${details ? ` ${details}` : ""}`,
        meta: { mediaId: str(media.id), mimeType: str(media.mime_type), sha256: str(media.sha256), filename, caption },
      };
    }
    case "location": {
      const location = rec(message.location) ?? {};
      const latitude = num(location.latitude);
      const longitude = num(location.longitude);
      const place = [str(location.name), str(location.address)].filter(Boolean).join(", ");
      const coordinates = latitude !== null && longitude !== null ? `(${latitude}, ${longitude})` : "";
      return {
        type,
        body: ["[Location]", place, coordinates].filter(Boolean).join(" "),
        meta: {
          location: {
            latitude,
            longitude,
            name: str(location.name),
            address: str(location.address),
            url: str(location.url),
          },
        },
      };
    }
    case "contacts": {
      const cards = recs(message.contacts);
      const summary = cards
        .map((card) => {
          const name = str(rec(card.name)?.formatted_name);
          const phones = recs(card.phones).map((phone) => str(phone.phone));
          return [name, ...phones].filter(Boolean).join(" ");
        })
        .filter(Boolean)
        .join("; ");
      return { type, body: `[Contact card]${summary ? ` ${summary}` : ""}`, meta: { contacts: cards } };
    }
    case "reaction": {
      const reaction = rec(message.reaction) ?? {};
      const emoji = str(reaction.emoji);
      return {
        type,
        body: emoji ? `[Reaction] ${emoji}` : "[Reaction removed]",
        meta: { reactedTo: str(reaction.message_id) },
      };
    }
    case "order": {
      const order = rec(message.order) ?? {};
      const count = arr(order.product_items).length;
      const note = str(order.text);
      return {
        type,
        body: `[Order] ${count} item${count === 1 ? "" : "s"}${note ? ` — ${note}` : ""}`,
        meta: { order },
      };
    }
    case "system": {
      const system = rec(message.system) ?? {};
      return { type, body: `[System] ${str(system.body)}`.trim(), meta: { system } };
    }
    default:
      return { type, body: "[Unsupported message type]", meta: {} };
  }
}

/**
 * Messages from a WhatsApp Cloud API webhook (`entry[].changes[].value.{contacts, messages}`).
 * Delivery/read `statuses` and other fields are ignored.
 */
export function parseWhatsAppPayload(payload: unknown, now = new Date()): IncomingMessage[] {
  const root = rec(payload);
  if (!root) return [];
  const out: IncomingMessage[] = [];
  for (const entry of recs(root.entry)) {
    for (const change of recs(entry.changes)) {
      if (change.field !== undefined && change.field !== "messages") continue;
      const value = rec(change.value);
      if (!value) continue;
      const metadata = rec(value.metadata) ?? {};
      const contacts = recs(value.contacts);
      for (const message of recs(value.messages)) {
        const from = str(message.from);
        const contact = contacts.find((item) => str(item.wa_id) === from) ?? contacts[0];
        const { type, body, meta } = describeWhatsAppMessage(message);
        out.push({
          channel: "whatsapp",
          direction: "inbound",
          contactName: cleanLine(rec(contact?.profile)?.name, MAX.name),
          contactPhone: normalizePhone(from),
          contactEmail: "",
          subject: "",
          body: cleanText(body, MAX.body),
          externalId: cleanLine(message.id, MAX.externalId) || null,
          occurredAt: parseDate(message.timestamp, now),
          meta: sanitizeMeta({
            provider: "whatsapp",
            type,
            waId: from,
            phoneNumberId: str(metadata.phone_number_id),
            displayPhoneNumber: str(metadata.display_phone_number),
            ...meta,
            context: message.context,
            referral: message.referral,
            errors: message.errors,
          }),
        });
        if (out.length >= MAX_BATCH) return out;
      }
    }
  }
  return out;
}

/* ------------------------------------------------------------------ email */

interface EmailFields {
  provider: string;
  from: unknown;
  fromName: string;
  to: string;
  cc: string;
  replyTo: string;
  subject: unknown;
  text: unknown;
  html: unknown;
  providerId: string;
  messageId: string;
  date: unknown;
  attachments: { name: string; type: string; size: number | null }[];
  extra: Rec;
}

function emailFields(data: Rec): EmailFields {
  const base: EmailFields = {
    provider: "generic",
    from: undefined,
    fromName: "",
    to: "",
    cc: "",
    replyTo: "",
    subject: "",
    text: "",
    html: "",
    providerId: "",
    messageId: "",
    date: undefined,
    attachments: [],
    extra: {},
  };

  // Postmark inbound webhook.
  if (
    rec(data.FromFull) ||
    (Object.hasOwn(data, "From") && (Object.hasOwn(data, "TextBody") || Object.hasOwn(data, "HtmlBody")))
  ) {
    const full = rec(data.FromFull);
    return {
      ...base,
      provider: "postmark",
      from: str(full?.Email) || str(data.From),
      fromName: str(full?.Name) || str(data.FromName),
      to: str(data.To) || str(data.OriginalRecipient),
      cc: str(data.Cc),
      replyTo: str(data.ReplyTo),
      subject: data.Subject,
      text: str(data.TextBody) || str(data.StrippedTextReply),
      html: data.HtmlBody,
      providerId: str(data.MessageID),
      messageId: headerValue(data.Headers, "message-id"),
      date: data.Date,
      attachments: recs(data.Attachments).map((file) => ({
        name: str(file.Name),
        type: str(file.ContentType),
        size: num(file.ContentLength),
      })),
      extra: { mailboxHash: str(data.MailboxHash), messageStream: str(data.MessageStream) },
    };
  }

  // CloudMailin "JSON (Normalized)" format.
  const headers = rec(data.headers);
  if (headers && (rec(data.envelope) || Object.hasOwn(data, "plain") || Object.hasOwn(data, "html"))) {
    const envelope = rec(data.envelope) ?? {};
    return {
      ...base,
      provider: "cloudmailin",
      from: headerValue(headers, "from") || str(envelope.from),
      to: headerValue(headers, "to") || str(envelope.to),
      cc: headerValue(headers, "cc"),
      replyTo: headerValue(headers, "reply-to"),
      subject: headerValue(headers, "subject"),
      text: str(data.plain) || str(data.reply_plain),
      html: data.html,
      messageId: headerValue(headers, "message-id"),
      date: headerValue(headers, "date"),
      attachments: recs(data.attachments).map((file) => ({
        name: str(file.file_name),
        type: str(file.content_type),
        size: num(file.size),
      })),
      extra: { spf: str(rec(envelope.spf)?.result) },
    };
  }

  // Mailgun routes (form fields).
  if (Object.hasOwn(data, "body-plain") || Object.hasOwn(data, "stripped-text") || Object.hasOwn(data, "body-html")) {
    return {
      ...base,
      provider: "mailgun",
      from: pick(data, "from", "sender"),
      to: str(pick(data, "To", "recipient")),
      cc: str(pick(data, "Cc")),
      replyTo: str(pick(data, "Reply-To")),
      subject: pick(data, "subject"),
      text: str(data["body-plain"]) || str(data["stripped-text"]),
      html: data["body-html"],
      messageId: str(pick(data, "Message-Id")),
      date: pick(data, "Date", "timestamp"),
      attachments: recs(data.__files).map((file) => ({
        name: str(file.name),
        type: str(file.type),
        size: num(file.size),
      })),
    };
  }

  // Generic JSON (e.g. a Cloudflare Email Worker) and SendGrid Inbound Parse (form fields).
  const rawHeaders = typeof data.headers === "string" ? data.headers : "";
  return {
    ...base,
    provider: Object.hasOwn(data, "envelope") && rawHeaders ? "sendgrid" : "generic",
    from: pick(data, "from", "sender"),
    fromName: str(pick(data, "fromName", "from_name", "name")),
    to: str(pick(data, "to", "recipient")),
    cc: str(pick(data, "cc")),
    replyTo: str(pick(data, "replyTo", "reply_to")),
    subject: pick(data, "subject"),
    text: str(pick(data, "text", "plain", "body")),
    html: pick(data, "html"),
    providerId: str(pick(data, "id")),
    messageId:
      str(pick(data, "messageId", "message_id", "message-id")) ||
      (/^message-id:\s*(.+)$/im.exec(rawHeaders)?.[1] ?? ""),
    date: pick(data, "date", "receivedAt", "timestamp"),
    attachments: [...recs(data.attachments), ...recs(data.__files)].map((file) => ({
      name: str(file.name ?? file.filename ?? file.file_name),
      type: str(file.type ?? file.contentType ?? file.content_type ?? file.mimeType),
      size: num(file.size),
    })),
  };
}

/** One inbound email (any supported provider shape) as an inbox message. */
export function parseInboundEmail(payload: unknown, now = new Date()): ParseResult {
  const data = rec(payload);
  if (!data) return { ok: false, error: "Expected a JSON object." };
  const fields = emailFields(data);
  const sender = parseAddress(fields.from);
  if (!sender.email) return { ok: false, error: "Missing or invalid sender address (from)." };

  const subject = cleanLine(fields.subject, MAX.subject);
  const html = str(fields.html);
  const body = cleanText(fields.text, MAX.body) || truncate(htmlToText(html.replace(CONTROL_CHARS, "")), MAX.body);
  const messageId = cleanLine(fields.messageId, MAX.externalId).replace(/^<|>$/g, "");
  const occurredAt = parseDate(fields.date, now);
  const externalId =
    messageId ||
    (fields.providerId ? `${fields.provider}:${cleanLine(fields.providerId, 200)}` : "") ||
    (fields.date ? contentKey(sender.email, str(fields.date), subject, body.slice(0, 2000)) : null);

  return {
    ok: true,
    message: {
      channel: "email",
      direction: "inbound",
      contactName: cleanLine(fields.fromName, MAX.name) || sender.name,
      contactPhone: "",
      contactEmail: sender.email,
      subject,
      body,
      externalId: externalId ? truncate(externalId, MAX.externalId) : null,
      occurredAt,
      meta: sanitizeMeta({
        provider: fields.provider,
        to: cleanLine(fields.to, 500),
        cc: cleanLine(fields.cc, 500),
        replyTo: cleanLine(fields.replyTo, 300),
        messageId,
        providerId: cleanLine(fields.providerId, 200),
        attachments: fields.attachments.slice(0, 20).filter((file) => file.name || file.type),
        hasHtml: html ? true : undefined,
        ...fields.extra,
      }),
    },
  };
}

/* ---------------------------------------------------------- SMS and calls */

const MISSED_CALL = new Set([
  "missed",
  "missed_call",
  "missed-call",
  "no-answer",
  "noanswer",
  "busy",
  "failed",
  "canceled",
  "cancelled",
  "unanswered",
]);

export function formatDuration(totalSeconds: number) {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes === 0) return `${rest}s`;
  return rest ? `${minutes}m ${rest}s` : `${minutes}m`;
}

/**
 * One SMS or call event: Twilio/Exotel-style form fields (From, Body, MessageSid, CallSid,
 * CallStatus…) or JSON `{ from, body, id?, type?: "sms" | "call", duration?, status? }`.
 */
export function parseSmsPayload(payload: unknown, now = new Date()): ParseResult {
  const data = rec(payload);
  if (!data) return { ok: false, error: "Expected an object." };

  const contactPhone = normalizePhone(
    pick(data, "From", "from", "sender", "mobile", "msisdn", "caller", "callFrom", "phone"),
  );
  if (!contactPhone) return { ok: false, error: "Missing sender number (from)." };

  const text = cleanText(pick(data, "Body", "body", "message", "text", "content", "msg"), MAX.body);
  const declaredType = cleanLine(pick(data, "type", "event"), 30).toLowerCase();
  const callStatus = cleanLine(pick(data, "CallStatus", "DialCallStatus", "callStatus", "status"), 40).toLowerCase();
  const callId = cleanLine(pick(data, "CallSid", "callId", "call_id"), MAX.externalId);
  const isCall =
    declaredType === "call" || MISSED_CALL.has(declaredType) || (!declaredType && Boolean(callId) && !text);
  const duration = num(pick(data, "duration", "CallDuration", "DialCallDuration", "Duration"));
  const direction: MessageDirection = cleanLine(pick(data, "Direction", "direction"), 30)
    .toLowerCase()
    .startsWith("outbound")
    ? "outbound"
    : "inbound";
  const externalId =
    cleanLine(
      pick(
        data,
        "MessageSid",
        "SmsSid",
        "SmsMessageSid",
        "CallSid",
        "id",
        "messageId",
        "message_id",
        "sid",
        "uuid",
        "requestId",
      ),
      MAX.externalId,
    ) || null;
  const provider =
    Object.hasOwn(data, "AccountSid") || Object.hasOwn(data, "MessageSid") || Object.hasOwn(data, "CallSid")
      ? "twilio-style"
      : "generic";

  let subject = "";
  let body = text;
  if (isCall) {
    const missed = MISSED_CALL.has(declaredType) || MISSED_CALL.has(callStatus);
    subject = missed ? "Missed call" : "Phone call";
    const summary = [
      missed
        ? "Missed call"
        : callStatus
          ? `Call ${callStatus}`
          : direction === "outbound"
            ? "Outgoing call"
            : "Incoming call",
    ];
    if (duration !== null && duration > 0) summary.push(formatDuration(duration));
    body = [summary.join(" · "), text].filter(Boolean).join("\n\n");
  }

  const media: Rec[] = [];
  const mediaCount = Math.min(10, num(pick(data, "NumMedia")) ?? 0);
  for (let index = 0; index < mediaCount; index++) {
    const url = str(lookup(data, `MediaUrl${index}`));
    if (url) media.push({ url, type: str(lookup(data, `MediaContentType${index}`)) });
  }

  return {
    ok: true,
    message: {
      channel: isCall ? "call" : "sms",
      direction,
      contactName: cleanLine(pick(data, "name", "contactName", "CallerName", "callerName", "FromName"), MAX.name),
      contactPhone,
      contactEmail: "",
      subject,
      body: truncate(body, MAX.body),
      externalId,
      occurredAt: parseDate(pick(data, "date", "timestamp", "receivedAt", "time"), now),
      meta: sanitizeMeta({
        provider,
        to: normalizePhone(pick(data, "To", "to")),
        status: callStatus || undefined,
        duration: duration ?? undefined,
        media,
        raw: data,
      }),
    },
  };
}

/* -------------------------------------------------------- product matching */

/**
 * The product a message is about, when it quotes a product name — e.g. the website's pre-filled
 * WhatsApp text "…price and availability for Exide Inva Master IMTT2000". Longest name wins.
 */
export function matchProduct<T extends { name: string }>(text: string, products: T[]): T | null {
  const haystack = text.toLowerCase();
  if (!haystack.trim()) return null;
  let best: T | null = null;
  let bestLength = 0;
  for (const product of products) {
    const name = product.name.trim().toLowerCase();
    if (name.length < 5 || name.length <= bestLength) continue;
    if (haystack.includes(name)) {
      best = product;
      bestLength = name.length;
    }
  }
  return best;
}
