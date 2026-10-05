"use client";

import { ArrowDown, ArrowUp, ClipboardPaste, Plus, Star, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/admin/components/ui/button";
import { controlClass, Textarea } from "@/admin/components/ui/form-controls";
import type { ProductSpec } from "@/admin/content/types";
import { cn } from "@/lib/cn";

import { MAX_HIGHLIGHTED_SPECS } from "./constants";

interface Row extends ProductSpec {
  key: number;
}

let nextKey = 1;
const withKey = (spec: ProductSpec): Row => ({ ...spec, key: nextKey++ });

/** Parses "Label: value" / "Label<TAB>value" lines pasted from a datasheet or spreadsheet. */
function parsePasted(text: string): ProductSpec[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      const match = line.match(/^(.+?)\s*(?:\t|:|\s[-–—]\s|\|)\s*(.+)$/);
      return match
        ? [{ label: match[1].trim().slice(0, 60), value: match[2].trim().slice(0, 200), highlight: false }]
        : [];
    });
}

/** Technical specifications: label/value rows, ★ marks the (max 4) shown on the product card. */
export function SpecsEditor({
  name,
  defaultValue,
  error,
  onChange,
}: {
  name: string;
  defaultValue: ProductSpec[];
  error?: string;
  onChange?: () => void;
}) {
  const [rows, setRows] = useState<Row[]>(() => defaultValue.map(withKey));
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const highlighted = rows.filter((row) => row.highlight).length;

  const update = (next: Row[]) => {
    setRows(next);
    onChange?.();
  };
  const patch = (key: number, changes: Partial<ProductSpec>) =>
    update(rows.map((row) => (row.key === key ? { ...row, ...changes } : row)));
  const move = (index: number, offset: number) => {
    const next = [...rows];
    const [row] = next.splice(index, 1);
    next.splice(index + offset, 0, row);
    update(next);
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-slate-500">
        All rows appear in the product’s specification table. Star up to {MAX_HIGHLIGHTED_SPECS} to show them on the
        product card ({highlighted}/{MAX_HIGHLIGHTED_SPECS}
        {highlighted === 0 ? " — the first four are used" : ""}).
      </p>
      {rows.length ? (
        <ol className="flex flex-col gap-2">
          {rows.map((row, index) => (
            <li key={row.key} className="grid grid-cols-[auto_minmax(0,0.8fr)_minmax(0,1.2fr)_auto] items-center gap-2">
              <button
                type="button"
                onClick={() => patch(row.key, { highlight: !row.highlight })}
                disabled={!row.highlight && highlighted >= MAX_HIGHLIGHTED_SPECS}
                aria-pressed={row.highlight}
                aria-label={
                  row.highlight
                    ? `Remove “${row.label || "spec"}” from the card`
                    : `Show “${row.label || "spec"}” on the card`
                }
                title={row.highlight ? "Shown on the product card" : "Show on the product card"}
                className={cn(
                  "rounded-md p-1.5 transition-colors disabled:opacity-30",
                  row.highlight
                    ? "text-amber-500 hover:bg-amber-50"
                    : "text-slate-300 hover:bg-slate-100 hover:text-slate-500",
                )}
              >
                <Star className={cn("size-4", row.highlight && "fill-current")} />
              </button>
              <input
                value={row.label}
                maxLength={60}
                onChange={(event) => patch(row.key, { label: event.target.value })}
                placeholder="Label, e.g. Capacity"
                aria-label={`Spec ${index + 1} label`}
                className={cn(controlClass, "h-9")}
              />
              <input
                value={row.value}
                maxLength={200}
                onChange={(event) => patch(row.key, { value: event.target.value })}
                placeholder="Value, e.g. 150Ah @ C20"
                aria-label={`Spec ${index + 1} value`}
                className={cn(controlClass, "h-9")}
              />
              <span className="flex items-center">
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label={`Move spec ${index + 1} up`}
                >
                  <ArrowUp />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => move(index, 1)}
                  disabled={index === rows.length - 1}
                  aria-label={`Move spec ${index + 1} down`}
                >
                  <ArrowDown />
                </Button>
                <Button
                  size="icon-sm"
                  variant="danger-ghost"
                  onClick={() => update(rows.filter((item) => item.key !== row.key))}
                  aria-label={`Delete spec ${index + 1}`}
                >
                  <Trash2 />
                </Button>
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">No specifications yet.</p>
      )}
      {error ? (
        <p className="text-xs font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => update([...rows, withKey({ label: "", value: "", highlight: false })])}
          disabled={rows.length >= 40}
        >
          <Plus /> Add spec
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setPasteOpen((open) => !open)} aria-expanded={pasteOpen}>
          <ClipboardPaste /> Paste from datasheet
        </Button>
      </div>
      {pasteOpen ? (
        <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <label htmlFor={`${name}-paste`} className="text-xs font-semibold text-slate-700">
            One spec per line — “Label: value”, or two columns copied from Excel.
          </label>
          <Textarea
            id={`${name}-paste`}
            rows={5}
            value={pasteText}
            onChange={(event) => setPasteText(event.target.value)}
            placeholder={"Rated Capacity: 150Ah @ C20\nVoltage Rating: 12V DC Nominal"}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => {
                const parsed = parsePasted(pasteText);
                if (parsed.length) update([...rows, ...parsed.map(withKey)].slice(0, 40));
                setPasteText("");
                setPasteOpen(false);
              }}
              disabled={!pasteText.trim()}
            >
              Add {parsePasted(pasteText).length || ""} specs
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setPasteOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
      <input
        type="hidden"
        name={name}
        value={JSON.stringify(rows.map(({ label, value, highlight }) => ({ label, value, highlight })))}
      />
    </div>
  );
}
