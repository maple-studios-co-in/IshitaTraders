import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export const controlClass = cn(
  "block w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-xs transition-[border-color,box-shadow]",
  "placeholder:text-slate-400 hover:border-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 focus:outline-none",
  "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500",
  "aria-invalid:border-red-500 aria-invalid:ring-red-500/15",
);

interface FieldProps {
  label: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
  /** Shown to the right of the label, e.g. a character counter. */
  aside?: ReactNode;
}

export function Field({ label, htmlFor, hint, error, required, className, children, aside }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-sm font-semibold text-slate-800">
          {label}
          {required ? (
            <span className="ml-0.5 text-red-600" aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
        {aside ? <span className="text-xs text-slate-500">{aside}</span> : null}
      </div>
      {children}
      {error ? (
        <p className="text-xs font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs leading-relaxed text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlClass, "h-10", className)} {...props} />;
}

export function Textarea({ className, rows = 4, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={rows} className={cn(controlClass, "resize-y py-2 leading-relaxed", className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(controlClass, "h-10 cursor-pointer pr-8", className)} {...props}>
      {children}
    </select>
  );
}

interface ToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: ReactNode;
  description?: ReactNode;
}

/** A labelled switch (a styled checkbox, so it works in plain HTML forms). */
export function Toggle({ label, description, className, id, ...props }: ToggleProps) {
  return (
    <label htmlFor={id} className={cn("group flex cursor-pointer items-start gap-3", className)}>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input id={id} type="checkbox" className="peer sr-only" {...props} />
        <span className="h-6 w-11 rounded-full bg-slate-300 transition-colors peer-checked:bg-leaf-600 peer-focus-visible:ring-4 peer-focus-visible:ring-brand-500/25 peer-disabled:opacity-50" />
        <span className="pointer-events-none absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
      </span>
      <span className="flex flex-col">
        <span className="text-sm font-semibold text-slate-800">{label}</span>
        {description ? <span className="text-xs leading-relaxed text-slate-500">{description}</span> : null}
      </span>
    </label>
  );
}

export function Checkbox({
  label,
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { label: ReactNode }) {
  return (
    <label className={cn("inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700", className)}>
      <input type="checkbox" className="size-4 rounded border-slate-300 accent-navy-800" {...props} />
      {label}
    </label>
  );
}

/** A titled group of fields inside a card. */
export function FormSection({
  title,
  description,
  children,
  className,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}) {
  return (
    <section className={cn("rounded-xl border border-slate-200 bg-white shadow-card", className)}>
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="font-display text-base font-bold text-navy-950">{title}</h2>
          {description ? <p className="mt-0.5 text-sm text-slate-500">{description}</p> : null}
        </div>
        {actions}
      </header>
      <div className="flex flex-col gap-5 p-5">{children}</div>
    </section>
  );
}

export function FormGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid gap-5 sm:grid-cols-2", className)}>{children}</div>;
}
