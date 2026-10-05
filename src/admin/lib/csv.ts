/**
 * CSV for spreadsheets: RFC 4180 quoting, a UTF-8 BOM so Excel shows ₹ and Hindi correctly, and
 * cells that look like formulas (=, +, -, @) neutralised so a visitor's form input can't run in
 * someone's spreadsheet.
 */
export function toCsv(headers: string[], rows: unknown[][]): string {
  const cell = (value: unknown) => {
    let text = value === null || value === undefined ? "" : value instanceof Date ? value.toISOString() : String(value);
    if (/^[=+\-@\t\r]/.test(text) && !/^-?\d+(\.\d+)?$/.test(text)) text = `'${text}`;
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return `﻿${[headers, ...rows].map((row) => row.map(cell).join(",")).join("\r\n")}\r\n`;
}

export function csvResponse(fileName: string, csv: string) {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}

/** "ishita-products-2026-10-05.csv" */
export const datedFileName = (prefix: string) => `${prefix}-${new Date().toISOString().slice(0, 10)}.csv`;
