/**
 * Redirect rules shared by the form, the CSV import and the server validation. Client-safe: no I/O.
 */

import { reservedPathReason } from "@/admin/config/reserved-paths";
import { hasUnsafeCharacters, normalizePath } from "@/admin/lib/paths";

export const REDIRECT_CODES = [301, 302, 307, 308] as const;
export type RedirectCode = (typeof REDIRECT_CODES)[number];

export const isRedirectCode = (value: number): value is RedirectCode =>
  (REDIRECT_CODES as readonly number[]).includes(value);

export const redirectCodeInfo: Record<RedirectCode, { kind: "Permanent" | "Temporary"; label: string }> = {
  301: { kind: "Permanent", label: "301 · Permanent — moved for good (best for search engines)" },
  302: { kind: "Temporary", label: "302 · Temporary — for offers and short-term moves" },
  307: { kind: "Temporary", label: "307 · Temporary — also keeps form submissions" },
  308: { kind: "Permanent", label: "308 · Permanent — also keeps form submissions" },
};

export type Check<T> = { ok: true; value: T } | { ok: false; error: string };

export const SOURCE_MAX = 500;
export const DESTINATION_MAX = 2000;

/**
 * Validates the old address and returns its stored form (see `normalizePath`). A full link is
 * accepted too; only its path is used.
 */
export function checkSource(raw: string): Check<string> {
  let value = raw.trim();
  if (!value) return { ok: false, error: "Enter the old address, e.g. /old-page." };
  if (/^https?:\/\//i.test(value)) {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      return { ok: false, error: "That link isn’t valid." };
    }
    if (url.search || url.hash)
      return { ok: false, error: "Leave out the ?query and #anchor parts — redirects match the path only." };
    value = url.pathname;
  }
  if (!value.startsWith("/")) return { ok: false, error: "Start the old address with / — e.g. /old-page." };
  if (value.startsWith("//") || value.includes("\\"))
    return { ok: false, error: "Use a path with single forward slashes, e.g. /old-page." };
  if (/[?#]/.test(value))
    return { ok: false, error: "Leave out the ?query and #anchor parts — redirects match the path only." };
  if (hasUnsafeCharacters(value)) return { ok: false, error: "Remove spaces from the address (write a space as %20)." };
  if (value.length > SOURCE_MAX) return { ok: false, error: `Keep the address under ${SOURCE_MAX} characters.` };
  const path = normalizePath(value);
  const reserved = reservedPathReason(path);
  if (reserved) return { ok: false, error: reserved };
  return { ok: true, value: path };
}

export interface CheckedDestination {
  /** As entered (trimmed). */
  value: string;
  /** The normalised path when it points at this website, for self/loop checks; `null` for other sites. */
  internalPath: string | null;
}

/** Validates where a redirect sends visitors: a path on this site or a full http(s) link. */
export function checkDestination(raw: string, siteHosts: readonly string[]): Check<CheckedDestination> {
  const value = raw.trim();
  if (!value)
    return { ok: false, error: "Enter where visitors should go — a path like /new-page or a full https:// link." };
  if (value.length > DESTINATION_MAX)
    return { ok: false, error: `Keep the destination under ${DESTINATION_MAX} characters.` };
  if (hasUnsafeCharacters(value) || value.includes("\\"))
    return { ok: false, error: "Remove spaces from the destination (write a space as %20)." };
  if (value.startsWith("/")) {
    if (value.startsWith("//"))
      return { ok: false, error: "Start a path with a single /, or use a full https:// link." };
    return { ok: true, value: { value, internalPath: normalizePath(value) } };
  }
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      const internal = siteHosts.includes(url.host.toLowerCase());
      return { ok: true, value: { value, internalPath: internal ? normalizePath(url.pathname) : null } };
    } catch {
      return { ok: false, error: "That link isn’t valid." };
    }
  }
  return { ok: false, error: "Use a path starting with / (like /new-page) or a full link starting with https://." };
}

/**
 * Follows active redirects from `destination`; returns the chain when it leads back to `source`
 * (`["/a", "/b", "/a"]`), otherwise `null`. `next` maps a source to its internal destination path.
 */
export function findLoop(
  source: string,
  destination: string | null,
  next: ReadonlyMap<string, string | null>,
): string[] | null {
  if (!destination) return null;
  const chain = [source, destination];
  const seen = new Set([source]);
  let current: string | null = destination;
  while (current) {
    if (current === source) return chain;
    if (seen.has(current) || chain.length > 25) return null;
    seen.add(current);
    current = next.get(current) ?? null;
    if (current) chain.push(current);
  }
  return null;
}

/* ------------------------------------------------------------------ CSV */

export interface CsvRow {
  line: number;
  source: string;
  destination: string;
  code: string;
}

const HEADER_WORDS = new Set(["source", "from", "old", "old url", "old address", "source url", "from url"]);

/** Splits one CSV line (comma- or tab-separated, "quoted" cells with "" escapes). */
function splitCsvLine(line: string) {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    if (quoted) {
      if (char !== '"') cell += char;
      else if (line[index + 1] === '"') {
        cell += '"';
        index++;
      } else quoted = false;
    } else if (char === '"') quoted = true;
    else if (char === "," || char === "\t") {
      cells.push(cell);
      cell = "";
    } else cell += char;
  }
  cells.push(cell);
  return cells.map((value) => value.trim());
}

/** `source,destination[,code]` rows; blank lines, `#` comments and a header row are skipped. */
export function parseRedirectCsv(text: string): CsvRow[] {
  const rows: CsvRow[] = [];
  const lines = text.replace(/^\uFEFF/, "").split(/\r\n|\n|\r/);
  lines.forEach((raw, index) => {
    const line = raw.trim();
    if (!line || line.startsWith("#")) return;
    const [source = "", destination = "", code = ""] = splitCsvLine(line);
    if (rows.length === 0 && HEADER_WORDS.has(source.toLowerCase())) return;
    rows.push({ line: index + 1, source, destination, code });
  });
  return rows;
}
