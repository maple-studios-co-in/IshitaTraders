import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

import { adminButton } from "./button";
import { controlClass } from "./form-controls";

export type SearchParams = Record<string, string | string[] | undefined>;

export const param = (params: SearchParams, key: string) => {
  const value = params[key];
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
};

export const pageParam = (params: SearchParams) => Math.max(1, Number.parseInt(param(params, "page"), 10) || 1);

/** Builds `basePath?…` keeping current params, overriding some (empty value removes a param). */
export function hrefWith(basePath: string, params: SearchParams, overrides: Record<string, string | number | null>) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const v = Array.isArray(value) ? value[0] : value;
    if (v) next.set(key, v);
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (value === null || value === "") next.delete(key);
    else next.set(key, String(value));
  }
  const query = next.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function Pagination({
  basePath,
  params,
  page,
  pageSize,
  total,
}: {
  basePath: string;
  params: SearchParams;
  page: number;
  pageSize: number;
  total: number;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm"
    >
      <p className="text-slate-500">
        Showing <span className="font-semibold text-slate-700">{from.toLocaleString("en-IN")}</span>–
        <span className="font-semibold text-slate-700">{to.toLocaleString("en-IN")}</span> of{" "}
        <span className="font-semibold text-slate-700">{total.toLocaleString("en-IN")}</span>
      </p>
      <div className="flex items-center gap-1.5">
        {page > 1 ? (
          <Link
            href={hrefWith(basePath, params, { page: page - 1 })}
            className={adminButton({ variant: "secondary", size: "sm" })}
            aria-label="Previous page"
          >
            <ChevronLeft /> Prev
          </Link>
        ) : null}
        <span className="px-2 text-xs font-medium text-slate-500">
          Page {page} / {pages}
        </span>
        {page < pages ? (
          <Link
            href={hrefWith(basePath, params, { page: page + 1 })}
            className={adminButton({ variant: "secondary", size: "sm" })}
            aria-label="Next page"
          >
            Next <ChevronRight />
          </Link>
        ) : null}
      </div>
    </nav>
  );
}

/** A GET form for list filters: works without JavaScript and keeps filters in the URL (shareable). */
export function FilterBar({
  basePath,
  query,
  placeholder = "Search…",
  children,
  className,
  hidden,
}: {
  basePath: string;
  query: string;
  placeholder?: string;
  children?: ReactNode;
  className?: string;
  /** Params to keep while filtering (e.g. the active tab). */
  hidden?: Record<string, string>;
}) {
  return (
    <form
      action={basePath}
      method="get"
      role="search"
      className={cn("flex flex-col gap-2 border-b border-slate-100 p-3 sm:flex-row sm:items-center", className)}
    >
      {hidden
        ? Object.entries(hidden).map(([name, value]) =>
            value ? <input key={name} type="hidden" name={name} value={value} /> : null,
          )
        : null}
      <label className="relative flex-1">
        <span className="sr-only">Search</span>
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder={placeholder}
          className={cn(controlClass, "h-9 pl-9")}
        />
      </label>
      {children}
      <div className="flex gap-2">
        <button type="submit" className={adminButton({ variant: "secondary", size: "sm", className: "h-9" })}>
          Apply
        </button>
        <Link href={basePath} className={adminButton({ variant: "ghost", size: "sm", className: "h-9" })}>
          Reset
        </Link>
      </div>
    </form>
  );
}

export function FilterSelect({
  name,
  value,
  label,
  options,
}: {
  name: string;
  value: string;
  label: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="sr-only">{label}</span>
      <select name={name} defaultValue={value} className={cn(controlClass, "h-9 w-full sm:w-auto")} aria-label={label}>
        <option value="">{label}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
