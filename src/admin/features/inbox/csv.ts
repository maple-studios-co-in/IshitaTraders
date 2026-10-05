/**
 * CSV for spreadsheet apps (pure; RFC 4180 with CRLF rows). Text cells starting with = + - @ (or a
 * tab/CR) get a leading apostrophe so Excel/Sheets never evaluate them as formulas (CSV injection).
 */

const FORMULA_START = /^[=+\-@\t\r]/;

export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  let text = value instanceof Date ? value.toISOString() : String(value);
  if (FORMULA_START.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** A complete file: UTF-8 byte-order mark (so Excel reads ₹ and Hindi correctly), header, rows. */
export function toCsv(header: string[], rows: unknown[][]): string {
  const lines = [header, ...rows].map((row) => row.map(csvCell).join(","));
  return `﻿${lines.join("\r\n")}\r\n`;
}

const IST_STAMP = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** "2026-10-05 21:30" in India time: sortable, and Excel recognises it as a date. */
export const csvDateTime = (date: Date) => IST_STAMP.format(date);

/** "2026-10-05" in India time, for file names. */
export const istDate = (date = new Date()) => csvDateTime(date).slice(0, 10);
