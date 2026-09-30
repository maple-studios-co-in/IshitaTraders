"use client";

import { m, type Variants } from "motion/react";
import type { ReactNode } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;
const VIEWPORT = { once: true, margin: "0px 0px -12% 0px" } as const;

const elements = {
  div: m.div,
  li: m.li,
  ul: m.ul,
  ol: m.ol,
  article: m.article,
  figure: m.figure,
} as const;

type RevealElement = keyof typeof elements;

interface RevealProps {
  children: ReactNode;
  className?: string;
  as?: RevealElement;
  delay?: number;
  /** Starting vertical offset in px. */
  y?: number;
}

/** Fades and lifts its content into place the first time it scrolls into view. */
export function Reveal({ children, className, as = "div", delay = 0, y = 28 }: RevealProps) {
  const Component = elements[as] as typeof m.div;
  return (
    <Component
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT}
      transition={{ duration: 0.8, delay, ease: EASE }}
    >
      {children}
    </Component>
  );
}

interface RevealGroupProps {
  children: ReactNode;
  className?: string;
  as?: RevealElement;
  stagger?: number;
  delay?: number;
}

/** Staggers the entrance of its <RevealItem> children. */
export function RevealGroup({ children, className, as = "div", stagger = 0.1, delay = 0 }: RevealGroupProps) {
  const Component = elements[as] as typeof m.div;
  const variants: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: stagger, delayChildren: delay } },
  };
  return (
    <Component className={className} initial="hidden" whileInView="visible" viewport={VIEWPORT} variants={variants}>
      {children}
    </Component>
  );
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } },
};

export function RevealItem({
  children,
  className,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: RevealElement;
}) {
  const Component = elements[as] as typeof m.div;
  return (
    <Component className={className} variants={itemVariants}>
      {children}
    </Component>
  );
}
