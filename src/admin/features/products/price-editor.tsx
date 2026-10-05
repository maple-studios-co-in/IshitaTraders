"use client";

import { useState } from "react";

import { controlClass } from "@/admin/components/ui/form-controls";
import { SubmitButton } from "@/admin/components/ui/submit-button";
import { useFormAction } from "@/admin/components/ui/use-form-action";
import { useUnsavedChanges } from "@/admin/components/ui/use-unsaved-changes";
import { stockStatuses, stockStatusLabels, type StockStatus } from "@/admin/content/types";
import { cn } from "@/lib/cn";

import { saveQuickPrices } from "./actions";

export interface PriceRow {
  id: string;
  name: string;
  brand: string;
  mrp: number | null;
  price: number | null;
  showPrice: boolean;
  stockStatus: StockStatus;
}

type Draft = { mrp: string; price: string; showPrice: boolean; stockStatus: StockStatus };

const toDraft = (row: PriceRow): Draft => ({
  mrp: row.mrp?.toString() ?? "",
  price: row.price?.toString() ?? "",
  showPrice: row.showPrice,
  stockStatus: row.stockStatus,
});
const same = (a: Draft, b: Draft) =>
  a.mrp === b.mrp && a.price === b.price && a.showPrice === b.showPrice && a.stockStatus === b.stockStatus;

/** Spreadsheet-style editor: change many prices and stock levels, save once. */
export function PriceEditor({ rows }: { rows: PriceRow[] }) {
  const [original, setOriginal] = useState(() => Object.fromEntries(rows.map((row) => [row.id, toDraft(row)])));
  const [drafts, setDrafts] = useState(original);
  const { pending, onSubmit, errors } = useFormAction(saveQuickPrices, {
    // What was submitted is now the saved state.
    onSuccess: (_result, formData) =>
      setOriginal(
        Object.fromEntries(
          rows.map((row) => [
            row.id,
            {
              mrp: String(formData.get(`mrp:${row.id}`) ?? ""),
              price: String(formData.get(`price:${row.id}`) ?? ""),
              showPrice: formData.get(`show:${row.id}`) === "on",
              stockStatus: String(formData.get(`stock:${row.id}`)) as StockStatus,
            },
          ]),
        ),
      ),
  });

  const changed = rows.filter((row) => !same(drafts[row.id], original[row.id]));
  useUnsavedChanges(changed.length > 0);

  const patch = (id: string, changes: Partial<Draft>) =>
    setDrafts((current) => ({ ...current, [id]: { ...current[id], ...changes } }));
  const numeric = (value: string) => value.replace(/[^\d]/g, "");

  return (
    <form onSubmit={onSubmit}>
      <div className="sticky top-16 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <p className="text-sm text-slate-600">
          {changed.length ? (
            <span className="font-semibold text-amber-700">
              {changed.length} unsaved change{changed.length === 1 ? "" : "s"}
            </span>
          ) : (
            "Edit prices and stock, then save once. Prices are in whole rupees."
          )}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-lg px-3 text-sm font-semibold text-slate-600 hover:text-navy-900 disabled:opacity-40"
            disabled={!changed.length}
            onClick={() => setDrafts(original)}
          >
            Undo all
          </button>
          <SubmitButton pending={pending} pendingLabel="Saving…" disabled={!changed.length}>
            Save {changed.length || ""} change{changed.length === 1 ? "" : "s"}
          </SubmitButton>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold tracking-wide text-slate-500 uppercase">
              <th className="px-4 py-2.5">Product</th>
              <th className="px-3 py-2.5">MRP (₹)</th>
              <th className="px-3 py-2.5">Price (₹)</th>
              <th className="px-3 py-2.5 text-center">Show on site</th>
              <th className="px-3 py-2.5">Stock</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const draft = drafts[row.id];
              const dirty = !same(draft, original[row.id]);
              const error = errors[`price:${row.id}`];
              return (
                <tr key={row.id} className={cn("border-b border-slate-100", dirty && "bg-amber-50/60")}>
                  <td className="px-4 py-2">
                    <input type="hidden" name="ids" value={row.id} />
                    <p className="max-w-[320px] truncate font-semibold text-slate-800">{row.name}</p>
                    <p className="text-xs text-slate-500">{row.brand || "—"}</p>
                    {error ? (
                      <p className="text-xs font-medium text-red-600" role="alert">
                        {error}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      name={`mrp:${row.id}`}
                      value={draft.mrp}
                      onChange={(event) => patch(row.id, { mrp: numeric(event.target.value) })}
                      inputMode="numeric"
                      aria-label={`MRP of ${row.name}`}
                      className={cn(controlClass, "h-9 w-32 tabular-nums")}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      name={`price:${row.id}`}
                      value={draft.price}
                      onChange={(event) => patch(row.id, { price: numeric(event.target.value) })}
                      inputMode="numeric"
                      aria-label={`Price of ${row.name}`}
                      aria-invalid={!!error || undefined}
                      className={cn(controlClass, "h-9 w-32 tabular-nums")}
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      name={`show:${row.id}`}
                      checked={draft.showPrice}
                      onChange={(event) => patch(row.id, { showPrice: event.target.checked })}
                      aria-label={`Show the price of ${row.name} on the website`}
                      className="size-4 accent-navy-800"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      name={`stock:${row.id}`}
                      value={draft.stockStatus}
                      onChange={(event) => patch(row.id, { stockStatus: event.target.value as StockStatus })}
                      aria-label={`Stock of ${row.name}`}
                      className={cn(controlClass, "h-9 w-40")}
                    >
                      {stockStatuses.map((status) => (
                        <option key={status} value={status}>
                          {stockStatusLabels[status]}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </form>
  );
}
