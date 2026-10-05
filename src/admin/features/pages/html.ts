/**
 * Helpers for uploaded HTML documents, shared by the page form (client) and its Server Actions.
 * Client-safe: no I/O.
 */

/** Largest page we host (the Server Action body limit is 4 MB, so this leaves headroom). */
export const MAX_HTML_BYTES = 2 * 1024 * 1024;

/** File names we accept for upload. */
export const HTML_FILE_PATTERN = /\.html?$/i;

export const PAGE_TITLE_MAX = 200;
export const PAGE_DESCRIPTION_MAX = 300;

const entities: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  hellip: "…",
  copy: "©",
  reg: "®",
  trade: "™",
  rarr: "→",
  larr: "←",
  bull: "•",
  middot: "·",
  rupee: "₹",
};

function decodeEntities(text: string) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === "#") {
      const point =
        code[1] === "x" || code[1] === "X" ? Number.parseInt(code.slice(2), 16) : Number.parseInt(code.slice(1), 10);
      return Number.isFinite(point) && point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : match;
    }
    return entities[code.toLowerCase()] ?? match;
  });
}

/** The document's `<title>`, decoded and tidied ("" when there isn't one). */
export function extractTitle(html: string) {
  const match = /<title\b[^>]*>([\s\S]*?)<\/title\s*>/i.exec(html);
  if (!match) return "";
  return decodeEntities(match[1].replace(/<[^>]*>/g, ""))
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, PAGE_TITLE_MAX);
}

/** Whether text plausibly is an HTML document or fragment (and not a binary file renamed to .html). */
export function looksLikeHtml(text: string) {
  if (text.includes("\u0000")) return false;
  return /<(!doctype\s+html|html|head|body|meta|title|style|script|link|main|header|footer|section|article|nav|div|span|p|h[1-6]|a|img|picture|video|table|ul|ol|form|button|svg|iframe|template)\b/i.test(
    text,
  );
}

/** UTF-8 size of a string in bytes. */
export function byteLength(text: string) {
  return new TextEncoder().encode(text).length;
}

/** Compares two documents ignoring line-ending differences (browsers submit textareas with CRLF). */
export function sameDocument(a: string, b: string) {
  const normalise = (value: string) => value.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  return normalise(a) === normalise(b);
}
