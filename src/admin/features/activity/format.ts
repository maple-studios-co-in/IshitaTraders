import type { BadgeTone } from "@/admin/components/ui/primitives";

/** Display helpers for audit-trail entries (client-safe). */

/** `"Asha Verma <asha@example.com>"` → name + email (as written by `logActivity`). */
export function splitActor(actorName: string) {
  const match = /^(.*?)\s*<([^<>\s]+@[^<>\s]+)>$/.exec(actorName.trim());
  if (match) return { name: match[1] || match[2], email: match[2] };
  return { name: actorName.trim() || "System", email: "" };
}

const actionTones: [RegExp, BadgeTone][] = [
  [/^(delete|remove|destroy|purge|revoke|deactivate|lock)/, "red"],
  [/^(create|add|bootstrap|upload|import|restore|duplicate|invite)/, "leaf"],
  [/^(sign_in|sign_out|login|logout|verify)/, "slate"],
  [/^(export|backup|download)/, "amber"],
  [/^(audit|test)/, "violet"],
  [/^(status|assign|unread|read|publish|unpublish|reply|unlock|reset)/, "teal"],
];

/** Badge colour by the verb after the dot: deletions red, creations green, edits blue… */
export function actionTone(action: string): BadgeTone {
  const verb = (action.split(".").pop() ?? action).toLowerCase();
  return actionTones.find(([pattern]) => pattern.test(verb))?.[1] ?? "blue";
}

const acronyms = new Set([
  "faq",
  "seo",
  "url",
  "ip",
  "id",
  "html",
  "og",
  "ga",
  "sku",
  "mrp",
  "utm",
  "sms",
  "csv",
  "api",
]);

/** `"isPublished"` / `"lead_event"` → `"Is published"` / `"Lead event"`. */
export function humanize(key: string) {
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_.-]+/g, " ")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word) => (acronyms.has(word) ? word.toUpperCase() : word));
  const text = words.join(" ");
  return text ? text[0].toUpperCase() + text.slice(1) : key;
}

export interface FormattedValue {
  text: string;
  empty: boolean;
  truncated: boolean;
}

export interface FormattedChange {
  field: string;
  label: string;
  from: FormattedValue;
  to: FormattedValue;
}

/** A diff value for display: strings as they are, everything else as pretty JSON, long values cut. */
export function formatValue(value: unknown, max = 600): FormattedValue {
  if (value === null || value === undefined || value === "") return { text: "(empty)", empty: true, truncated: false };
  let text: string;
  if (typeof value === "string") text = value;
  else {
    try {
      text = JSON.stringify(value, null, 2) ?? String(value);
    } catch {
      text = String(value);
    }
  }
  if (text.length <= max) return { text, empty: false, truncated: false };
  return { text: `${text.slice(0, max).trimEnd()}…`, empty: false, truncated: true };
}

/** The stored `{ field: { from, to } }` map as a list, tolerating odd shapes from older rows. */
export function changeEntries(changes: unknown): { field: string; from: unknown; to: unknown }[] {
  if (!changes || typeof changes !== "object" || Array.isArray(changes)) return [];
  return Object.entries(changes as Record<string, unknown>).map(([field, change]) => {
    if (change && typeof change === "object" && !Array.isArray(change) && ("from" in change || "to" in change)) {
      const { from, to } = change as { from?: unknown; to?: unknown };
      return { field, from: from ?? null, to: to ?? null };
    }
    return { field, from: null, to: change };
  });
}

export function formatChanges(changes: unknown, max = 600): FormattedChange[] {
  return changeEntries(changes).map(({ field, from, to }) => ({
    field,
    label: humanize(field),
    from: formatValue(from, max),
    to: formatValue(to, max),
  }));
}
