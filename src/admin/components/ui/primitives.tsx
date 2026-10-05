import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/* ------------------------------------------------------------------ badge */

export type BadgeTone = "navy" | "blue" | "leaf" | "amber" | "red" | "slate" | "violet" | "teal";

const tones: Record<BadgeTone, string> = {
  navy: "bg-navy-800/10 text-navy-800 ring-navy-800/15",
  blue: "bg-brand-500/10 text-brand-600 ring-brand-500/20",
  leaf: "bg-leaf-600/12 text-leaf-700 ring-leaf-600/20",
  amber: "bg-amber-100 text-amber-800 ring-amber-600/20",
  red: "bg-red-50 text-red-700 ring-red-600/15",
  slate: "bg-slate-100 text-slate-600 ring-slate-500/15",
  violet: "bg-violet-50 text-violet-700 ring-violet-600/15",
  teal: "bg-teal-50 text-teal-700 ring-teal-600/15",
};

export function Badge({
  tone = "slate",
  children,
  className,
  dot,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap ring-1 ring-inset",
        tones[tone],
        className,
      )}
    >
      {dot ? <span aria-hidden="true" className="size-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------- card */

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-xl border border-slate-200 bg-white shadow-card", className)}>{children}</div>;
}

export function CardHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4", className)}
    >
      <div className="min-w-0">
        <h2 className="font-display text-base font-bold text-navy-950">{title}</h2>
        {description ? <p className="mt-0.5 text-sm text-slate-500">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------- page header */

export interface Crumb {
  label: string;
  href?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  breadcrumbs?: Crumb[];
}) {
  return (
    <header className="flex flex-col gap-4 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {breadcrumbs?.length ? (
          <nav aria-label="Breadcrumb" className="mb-2">
            <ol className="flex flex-wrap items-center gap-1 text-xs font-medium text-slate-500">
              {breadcrumbs.map((crumb, index) => (
                <li key={`${crumb.label}-${index}`} className="flex items-center gap-1">
                  {index > 0 ? <ChevronRight aria-hidden="true" className="size-3 text-slate-400" /> : null}
                  {crumb.href ? (
                    <Link href={crumb.href} className="hover:text-navy-800">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span aria-current="page" className="text-slate-700">
                      {crumb.label}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        ) : null}
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-navy-950 sm:text-[26px]">{title}</h1>
        {description ? <p className="mt-1 max-w-3xl text-sm text-slate-600">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

/* ------------------------------------------------------------------ table */

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">{children}</table>
    </div>
  );
}

export function TH({
  children,
  className,
  align,
}: {
  children?: ReactNode;
  className?: string;
  align?: "right" | "center";
}) {
  return (
    <th
      scope="col"
      className={cn(
        "border-b border-slate-200 bg-slate-50/80 px-4 py-2.5 text-xs font-semibold tracking-wide whitespace-nowrap text-slate-500 uppercase",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function TD({
  children,
  className,
  align,
}: {
  children?: ReactNode;
  className?: string;
  align?: "right" | "center";
}) {
  return (
    <td
      className={cn(
        "border-b border-slate-100 px-4 py-3 align-middle text-slate-700",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
    >
      {children}
    </td>
  );
}

/* ------------------------------------------------------------- empty state */

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 px-6 py-14 text-center", className)}>
      {icon ? (
        <div className="flex size-12 items-center justify-center rounded-full bg-surface text-navy-800 [&_svg]:size-6">
          {icon}
        </div>
      ) : null}
      <div>
        <p className="font-display text-base font-bold text-navy-950">{title}</p>
        {description ? <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

/* ----------------------------------------------------------------- callout */

const calloutTones = {
  info: "border-brand-500/25 bg-brand-500/5 text-navy-900",
  warning: "border-amber-300 bg-amber-50 text-amber-900",
  danger: "border-red-200 bg-red-50 text-red-800",
  success: "border-leaf-600/25 bg-leaf-600/8 text-leaf-700",
};

export function Callout({
  tone = "info",
  title,
  children,
  icon,
  className,
}: {
  tone?: keyof typeof calloutTones;
  title?: ReactNode;
  children?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === "danger" ? "alert" : undefined}
      className={cn("flex gap-3 rounded-xl border px-4 py-3 text-sm", calloutTones[tone], className)}
    >
      {icon ? <span className="mt-0.5 shrink-0 [&_svg]:size-4">{icon}</span> : null}
      <div className="min-w-0 leading-relaxed">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={cn(title && "mt-0.5", "opacity-90")}>{children}</div> : null}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- stat card */

export function StatCard({
  label,
  value,
  hint,
  icon,
  href,
  tone = "navy",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  href?: string;
  tone?: "navy" | "leaf" | "blue" | "amber";
}) {
  const iconTone = {
    navy: "bg-navy-800/10 text-navy-800",
    leaf: "bg-leaf-600/12 text-leaf-700",
    blue: "bg-brand-500/10 text-brand-600",
    amber: "bg-amber-100 text-amber-700",
  }[tone];
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        {icon ? (
          <span className={cn("flex size-9 items-center justify-center rounded-lg [&_svg]:size-[18px]", iconTone)}>
            {icon}
          </span>
        ) : null}
      </div>
      <p className="mt-2 font-display text-3xl font-extrabold tracking-tight text-navy-950">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </>
  );
  const className =
    "block rounded-xl border border-slate-200 bg-white p-5 shadow-card transition-[border-color,box-shadow]";
  return href ? (
    <Link
      href={href}
      className={cn(className, "hover:border-navy-800/40 hover:shadow-[0_12px_30px_-18px_rgb(0_35_111/0.4)]")}
    >
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

/* ------------------------------------------------------------------- tabs */

export function LinkTabs({
  items,
  className,
}: {
  items: { label: ReactNode; href: string; active: boolean; count?: number }[];
  className?: string;
}) {
  return (
    <nav className={cn("-mx-1 flex gap-1 overflow-x-auto border-b border-slate-200 px-1", className)}>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          className={cn(
            "-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors",
            item.active
              ? "border-navy-800 text-navy-900"
              : "border-transparent text-slate-500 hover:border-slate-300 hover:text-navy-900",
          )}
        >
          {item.label}
          {item.count !== undefined ? (
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[11px] leading-none font-bold",
                item.active ? "bg-navy-800 text-white" : "bg-slate-100 text-slate-600",
              )}
            >
              {item.count.toLocaleString("en-IN")}
            </span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}

/* ------------------------------------------------------- definition list */

export function DetailList({
  items,
  className,
}: {
  items: { label: ReactNode; value: ReactNode }[];
  className?: string;
}) {
  return (
    <dl className={cn("grid gap-x-6 gap-y-4 sm:grid-cols-2", className)}>
      {items.map((item, index) => (
        <div key={index} className="min-w-0">
          <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{item.label}</dt>
          <dd className="mt-1 text-sm break-words whitespace-pre-line text-slate-800">
            {item.value || <span className="text-slate-400">—</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}
