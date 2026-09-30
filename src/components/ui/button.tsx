import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { SmartLink, type SmartLinkProps } from "./smart-link";

export type ButtonVariant = "primary" | "accent" | "outline" | "white" | "soft" | "whatsapp" | "light";
export type ButtonSize = "sm" | "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-navy-800 text-white hover:bg-brand-600 shadow-card",
  accent: "bg-leaf-600 text-white hover:bg-leaf-700 shadow-card",
  outline: "border border-brand-700 bg-slate-50 text-black hover:bg-white hover:shadow-soft",
  white: "bg-white text-navy-800 shadow-[0_1px_4px_rgb(0_0_0/0.1)] hover:bg-surface",
  soft: "bg-surface text-navy-900 hover:bg-surface-strong",
  whatsapp: "bg-green-600 text-white hover:bg-green-700 shadow-[0_1px_4px_rgb(0_0_0/0.1)]",
  light: "border border-slate-300 bg-white text-navy-700 hover:border-navy-700",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-[30px] gap-1.5 rounded px-3.5 text-xs",
  md: "h-11 gap-2 rounded-md px-6 text-sm",
  lg: "h-14 gap-2.5 rounded-[7px] px-7 text-[17px]",
};

export function buttonStyles({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  return cn(
    "group/button inline-flex shrink-0 items-center justify-center font-semibold whitespace-nowrap select-none",
    "transition-[background-color,border-color,color,box-shadow,transform] duration-300 ease-out-expo active:scale-[0.98]",
    "disabled:pointer-events-none disabled:opacity-60",
    variantClasses[variant],
    sizeClasses[size],
    className,
  );
}

interface ButtonLinkProps extends SmartLinkProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function ButtonLink({ variant, size, className, ...props }: ButtonLinkProps) {
  return <SmartLink className={buttonStyles({ variant, size, className })} {...props} />;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

export function Button({ variant, size, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonStyles({ variant, size, className })} {...props} />;
}

/** Arrow that nudges right when its parent button/link is hovered. */
export function ButtonArrow({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex transition-transform duration-300 ease-out-expo group-hover/button:translate-x-1 group-hover/link:translate-x-1",
        className,
      )}
    >
      {children}
    </span>
  );
}
