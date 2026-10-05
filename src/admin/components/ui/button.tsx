import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/cn";

export type AdminButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "danger-ghost" | "success";
export type AdminButtonSize = "sm" | "md" | "lg" | "icon" | "icon-sm";

const variants: Record<AdminButtonVariant, string> = {
  primary: "bg-navy-800 text-white shadow-sm hover:bg-brand-600",
  secondary: "border border-slate-300 bg-white text-navy-900 shadow-sm hover:border-navy-800 hover:bg-surface",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-navy-900",
  danger: "bg-red-600 text-white shadow-sm hover:bg-red-700",
  "danger-ghost": "text-red-600 hover:bg-red-50 hover:text-red-700",
  success: "bg-leaf-600 text-white shadow-sm hover:bg-leaf-700",
};

const sizes: Record<AdminButtonSize, string> = {
  sm: "h-8 gap-1.5 rounded-md px-3 text-xs",
  md: "h-10 gap-2 rounded-lg px-4 text-sm",
  lg: "h-11 gap-2 rounded-lg px-5 text-sm",
  icon: "size-10 rounded-lg",
  "icon-sm": "size-8 rounded-md",
};

export function adminButton({
  variant = "primary",
  size = "md",
  className,
}: { variant?: AdminButtonVariant; size?: AdminButtonSize; className?: string } = {}) {
  return cn(
    "inline-flex shrink-0 items-center justify-center font-semibold whitespace-nowrap transition-colors duration-150",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
    "disabled:pointer-events-none disabled:opacity-55 [&_svg]:size-4 [&_svg]:shrink-0",
    variants[variant],
    sizes[size],
    className,
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: AdminButtonVariant;
  size?: AdminButtonSize;
  children: ReactNode;
}

export function Button({ variant, size, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={adminButton({ variant, size, className })} {...props} />;
}

interface ButtonLinkProps extends ComponentProps<typeof Link> {
  variant?: AdminButtonVariant;
  size?: AdminButtonSize;
}

export function ButtonLink({ variant, size, className, ...props }: ButtonLinkProps) {
  return <Link className={adminButton({ variant, size, className })} {...props} />;
}

/** External link styled as a button (opens in a new tab). */
export function ButtonAnchor({
  variant,
  size,
  className,
  ...props
}: ComponentProps<"a"> & { variant?: AdminButtonVariant; size?: AdminButtonSize }) {
  return (
    <a target="_blank" rel="noopener noreferrer" className={adminButton({ variant, size, className })} {...props} />
  );
}
