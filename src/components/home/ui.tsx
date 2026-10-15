import type { ButtonHTMLAttributes, ElementType, ReactNode } from "react";

import { SmartLink, type SmartLinkProps } from "@/components/ui/smart-link";
import { cn } from "@/lib/cn";

import { ArrowIcon } from "./icons";

/**
 * Building blocks shared by the homepage sections (Figma coBLUmSDJE5yrXgsWcbpCF). Every section is a
 * full-bleed band whose content sits in the `band` utility: 24 → 88 px padding, 1264 px at most.
 */

export type Tone = "light" | "dark";

/** Small grey line above a section's statement ("What is ISHITA", "Product lineup."). */
export function Label({
  as: Tag = "h2",
  id,
  tone = "light",
  className,
  children,
}: {
  as?: ElementType;
  id?: string;
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag id={id} className={cn("type-label", tone === "dark" ? "text-ish-line" : "text-ish-muted", className)}>
      {children}
    </Tag>
  );
}

/** A section's headline sentence; each entry of `lines` starts on a new line where there is room. */
export function Statement({
  lines,
  tone = "light",
  as: Tag = "p",
  id,
  className,
}: {
  lines: readonly string[];
  tone?: Tone;
  as?: ElementType;
  id?: string;
  className?: string;
}) {
  return (
    <Tag id={id} className={cn("type-statement", tone === "dark" ? "text-white" : "text-ish-ink", className)}>
      <Lines lines={lines} />
    </Tag>
  );
}

/** Lines that break where the design breaks them, and wrap naturally when the screen is narrower. */
export function Lines({ lines }: { lines: readonly string[] }) {
  return lines.map((line, index) => (
    <span key={line} className="block">
      {line}
      {index < lines.length - 1 ? " " : null}
    </span>
  ));
}

const actionTones = {
  blue: "bg-ish-blue text-white hover:bg-ish-blue-deep",
  white: "bg-white text-ish-ink hover:bg-ish-pale",
} as const;

export type ActionTone = keyof typeof actionTones;

/** The design's 52 px buttons: label on the left, arrow on the right. */
export function actionClasses(tone: ActionTone, className?: string) {
  return cn(
    "group/action inline-flex h-[52px] shrink-0 items-center justify-between gap-4 rounded-[12px] pr-3 pl-4 text-[14px] leading-[1.5] whitespace-nowrap select-none",
    "transition-[background-color,color,scale] duration-200 active:scale-[0.985] disabled:pointer-events-none disabled:opacity-60",
    actionTones[tone],
    className,
  );
}

export function ActionArrow({ className }: { className?: string }) {
  return (
    <ArrowIcon
      className={cn(
        "size-[18px] shrink-0 transition-transform duration-300 ease-out-expo group-hover/action:translate-x-1",
        className,
      )}
    />
  );
}

export function ActionLink({ tone = "blue", className, children, ...props }: SmartLinkProps & { tone?: ActionTone }) {
  return (
    <SmartLink className={actionClasses(tone, className)} {...props}>
      <span>{children}</span>
      <ActionArrow />
    </SmartLink>
  );
}

export function ActionButton({
  tone = "blue",
  className,
  children,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: ActionTone; children: ReactNode }) {
  return (
    <button type={type} className={actionClasses(tone, className)} {...props}>
      <span>{children}</span>
      <ActionArrow />
    </button>
  );
}
