/** Formatting helpers for the admin (client-safe). Times are shown in India Standard Time. */

const TIME_ZONE = "Asia/Kolkata";

const dateTime = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: TIME_ZONE,
});
const dateOnly = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: TIME_ZONE,
});
const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

const toDate = (value: Date | string | number) => (value instanceof Date ? value : new Date(value));

export const formatDateTime = (value: Date | string | number) => dateTime.format(toDate(value));
export const formatDate = (value: Date | string | number) => dateOnly.format(toDate(value));
export const formatINR = (value: number) => inr.format(value);

/** "3 minutes ago", "yesterday", falling back to a date after a week. */
export function timeAgo(value: Date | string | number, now = Date.now()) {
  const date = toDate(value);
  const seconds = Math.round((date.getTime() - now) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 45) return "just now";
  if (abs < 3600) return relative.format(Math.round(seconds / 60), "minute");
  if (abs < 86_400) return relative.format(Math.round(seconds / 3600), "hour");
  if (abs < 7 * 86_400) return relative.format(Math.round(seconds / 86_400), "day");
  return formatDate(date);
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export const pluralize = (count: number, singular: string, plural = `${singular}s`) =>
  `${count.toLocaleString("en-IN")} ${count === 1 ? singular : plural}`;

/** Indian mobile numbers as people write them: "+91 73524 05030". */
export function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  const local =
    digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits.length === 10 ? digits : null;
  return local ? `+91 ${local.slice(0, 5)} ${local.slice(5)}` : value;
}

/** wa.me needs digits only, with country code. */
export function whatsappDigits(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length === 10 ? `91${digits}` : digits;
}
