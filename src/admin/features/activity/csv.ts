/**
 * CSV for spreadsheets (client-safe, no I/O): RFC 4180 quoting, CRLF rows, and a guard against
 * formula injection — a cell like `=HYPERLINK(…)` typed into a form must stay text in Excel/Sheets.
 */

/** Excel's per-cell limit is 32,767 characters. */
const MAX_CELL = 32_000;

/** Leading characters that make Excel, Sheets or LibreOffice evaluate a cell. */
const FORMULA_TRIGGER = /^(?:[=+\-@\t\r]|\s+[=+\-@])/;

export function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? "" : value instanceof Date ? value.toISOString() : String(value);
  if (text.length > MAX_CELL) text = `${text.slice(0, MAX_CELL)}…`;
  if (FORMULA_TRIGGER.test(text)) text = `'${text}`;
  return /[",\r\n]|^\s|\s$/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function csvRow(values: readonly unknown[]): string {
  return `${values.map(csvCell).join(",")}\r\n`;
}

/** Byte-order mark so Excel opens the file as UTF-8 (₹, —, Hindi names). */
export const CSV_BOM = "﻿";
