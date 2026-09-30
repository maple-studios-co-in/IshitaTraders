import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "dark" | "light";

export function Eyebrow({
  children,
  className,
  tone = "dark",
}: {
  children: ReactNode;
  className?: string;
  tone?: Tone;
}) {
  return (
    <p
      className={cn(
        "text-xs font-bold tracking-[0.1em] uppercase sm:text-[12.7px]",
        tone === "dark" ? "text-navy-900" : "text-white",
        className,
      )}
    >
      {children}
    </p>
  );
}

export function SectionTitle({
  children,
  className,
  tone = "dark",
  as: Tag = "h2",
  id,
}: {
  children: ReactNode;
  className?: string;
  tone?: Tone;
  as?: "h1" | "h2" | "h3";
  id?: string;
}) {
  return (
    <Tag
      id={id}
      className={cn(
        "font-display text-[clamp(1.875rem,1.35rem+1.6vw,2.6rem)] leading-[1.22] font-bold tracking-[-0.02em] text-balance-safe",
        tone === "dark" ? "text-navy-900" : "text-white",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function SectionLead({
  children,
  className,
  tone = "dark",
}: {
  children: ReactNode;
  className?: string;
  tone?: Tone;
}) {
  return (
    <p className={cn("text-base leading-relaxed", tone === "dark" ? "text-slate-600" : "text-white/90", className)}>
      {children}
    </p>
  );
}

interface SectionHeaderProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  titleId?: string;
  tone?: Tone;
  align?: "start" | "center";
  /** Optional element rendered opposite the heading on wide screens (e.g. a "view all" link). */
  action?: ReactNode;
  className?: string;
}

export function SectionHeader({
  eyebrow,
  title,
  lead,
  titleId,
  tone = "dark",
  align = "start",
  action,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-5 md:flex-row md:items-end md:justify-between",
        align === "center" && "items-center text-center md:flex-col md:items-center",
        className,
      )}
    >
      <div className={cn("flex max-w-3xl flex-col gap-1.5", align === "center" && "items-center")}>
        {eyebrow ? <Eyebrow tone={tone}>{eyebrow}</Eyebrow> : null}
        <SectionTitle id={titleId} tone={tone}>
          {title}
        </SectionTitle>
        {lead ? <SectionLead tone={tone}>{lead}</SectionLead> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
