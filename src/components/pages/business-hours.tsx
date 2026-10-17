"use client";

import { useId, useMemo, useState, useSyncExternalStore } from "react";

import {
  DEFAULT_BUSINESS_HOURS,
  WEEKDAYS,
  formatRange,
  openingStatus,
  parseBusinessHours,
  shopClock,
  weekSummary,
} from "@/lib/business-hours";
import { cn } from "@/lib/cn";

import { FigmaIcon } from "./figma-icons";

// The current minute, refreshed every 30 s; null while rendering on the server (the page is cached).
const subscribeToClock = (onChange: () => void) => {
  const timer = window.setInterval(onChange, 30_000);
  return () => window.clearInterval(timer);
};
const currentMinute = () => Math.floor(Date.now() / 60_000);
const noMinute = () => null;

/**
 * "Open · Closes 6:30 pm" from Admin → Business → Opening hours, with the week underneath on
 * demand. Text the parser doesn't understand is shown exactly as typed.
 */
export function BusinessHours({ text }: { text: string }) {
  const source = text.trim() || DEFAULT_BUSINESS_HOURS;
  const week = useMemo(() => parseBusinessHours(source), [source]);
  const minute = useSyncExternalStore(subscribeToClock, currentMinute, noMinute);
  const [expanded, setExpanded] = useState(false);
  const listId = useId();

  if (!week) {
    return <p className="text-[16px] leading-6 font-semibold text-white/95">{source}</p>;
  }

  const now = minute === null ? null : shopClock(new Date(minute * 60_000));
  const status = now ? openingStatus(week, now) : null;
  const label = status?.label ?? weekSummary(week) ?? "Opening hours";

  return (
    <div>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={listId}
        onClick={() => setExpanded((value) => !value)}
        className="group flex items-center gap-2 rounded-md text-left text-[15px] leading-6 font-semibold text-white/95 sm:text-[16px]"
      >
        {status ? (
          <span
            aria-hidden="true"
            className={cn("size-2 shrink-0 rounded-full", status.open ? "bg-[#a3e635]" : "bg-[#fca5a5]")}
          />
        ) : null}
        <span>{label}</span>
        <span className="sr-only">, {expanded ? "hide" : "show"} the week’s hours</span>
        <FigmaIcon
          name="chevronDownWhite"
          className={cn("h-[5.5px] w-[11px] shrink-0 transition-transform duration-300", expanded && "rotate-180")}
        />
      </button>
      <ul id={listId} hidden={!expanded} className="mt-3 grid max-w-[22rem] gap-1.5 text-[13.5px] leading-5">
        {WEEKDAYS.map((name, day) => {
          const hours = week[day];
          const today = now?.day === day;
          return (
            <li
              key={name}
              className={cn("flex justify-between gap-6", today ? "font-semibold text-white" : "text-white/70")}
            >
              <span>
                {name}
                {today ? <span className="sr-only"> (today)</span> : null}
              </span>
              <span>{hours ? formatRange(hours) : "Closed"}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
