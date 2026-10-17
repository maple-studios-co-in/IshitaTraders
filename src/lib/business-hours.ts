/**
 * Opening hours from the admin's free text ("Mon–Sat 9:30 am – 6:30 pm", "Mon–Fri 9–6, Sat 10 am
 * – 2 pm, Sun closed"), read as a week so the site can say whether the shop is open right now.
 * Times are the shop's own (India Standard Time), wherever the visitor is.
 */

/** Used while the admin's "Opening hours" field is empty (as in the website design). */
export const DEFAULT_BUSINESS_HOURS = "Mon–Sat 9:30 am – 6:30 pm";

export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

/** Minutes after midnight. */
export interface DayHours {
  open: number;
  close: number;
}

/** Monday first; null = closed that day. */
export type WeekHours = (DayHours | null)[];

const DAY_TOKEN = /\b(mon|tue|wed|thu|fri|sat|sun)[a-z]*\.?/gi;
const RANGE_SEPARATOR = /\s*(?:–|—|-|to)\s*/i;
const TIME_RANGE =
  /(\d{1,2})(?:[:.](\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?\s*(?:–|—|-|to)\s*(\d{1,2})(?:[:.](\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?/i;

const dayIndex = (token: string) =>
  ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].indexOf(token.slice(0, 3).toLowerCase());

function toMinutes(hour: number, minute: number, meridiem: "a" | "p" | null) {
  const h = meridiem ? (hour % 12) + (meridiem === "p" ? 12 : 0) : hour;
  return h * 60 + minute;
}

function parseTimeRange(match: RegExpMatchArray): DayHours | null {
  const [, h1, m1 = "0", ap1, h2, m2 = "0", ap2] = match;
  const first = ap1 ? (ap1[0].toLowerCase() as "a" | "p") : null;
  const second = ap2 ? (ap2[0].toLowerCase() as "a" | "p") : null;
  let open = toMinutes(Number(h1), Number(m1), first ?? second);
  let close = toMinutes(Number(h2), Number(m2), second ?? first);
  // "9:30 – 6:30 pm": the morning half has no am of its own.
  if (!first && second && open >= close) open = toMinutes(Number(h1), Number(m1), "a");
  // "9–6" with no am/pm at all: an evening close.
  if (!first && !second && close <= open) close += 12 * 60;
  if (open >= close || close > 24 * 60) return null;
  return { open, close };
}

/** The days a piece of text names: "Mon–Sat", "Monday to Friday", "Sun", "daily". */
function daysIn(text: string): number[] {
  if (/\b(daily|every\s*day|all\s*days|7\s*days)\b/i.test(text)) return [0, 1, 2, 3, 4, 5, 6];
  const tokens = [...text.matchAll(DAY_TOKEN)];
  if (tokens.length === 0) return [];
  if (tokens.length === 2) {
    const between = text.slice((tokens[0].index ?? 0) + tokens[0][0].length, tokens[1].index);
    if (RANGE_SEPARATOR.test(between) && between.trim().length <= 4) {
      const from = dayIndex(tokens[0][1]);
      const to = dayIndex(tokens[1][1]);
      const days: number[] = [];
      for (let day = from; ; day = (day + 1) % 7) {
        days.push(day);
        if (day === to || days.length === 7) break;
      }
      return days;
    }
  }
  return tokens.map((token) => dayIndex(token[1]));
}

/** Reads the admin text; null when it can't be understood (the site then shows it as written). */
export function parseBusinessHours(text: string): WeekHours | null {
  const week: WeekHours = Array.from({ length: 7 }, () => null);
  let understood = false;
  let pendingDays: number[] = [];

  for (const segment of text.split(/[,;\n]+|\s+&\s+|\s+and\s+/i)) {
    const time = segment.match(TIME_RANGE);
    const days = daysIn(
      time ? segment.slice(0, time.index) + segment.slice((time.index ?? 0) + time[0].length) : segment,
    );
    if (/closed/i.test(segment) && !time) {
      days.forEach((day) => (week[day] = null));
      understood ||= days.length > 0;
      pendingDays = [];
      continue;
    }
    if (!time) {
      // "Mon, Wed, Fri 9–5": days listed before the segment that carries the time.
      pendingDays.push(...days);
      continue;
    }
    const hours = parseTimeRange(time);
    if (!hours) continue;
    const target = [...pendingDays, ...days];
    (target.length > 0 ? target : [0, 1, 2, 3, 4, 5, 6]).forEach((day) => (week[day] = hours));
    pendingDays = [];
    understood = true;
  }

  return understood ? week : null;
}

/** "9:30 am", "6 pm". */
export function formatTime(minutes: number) {
  const hour24 = Math.floor(minutes / 60) % 24;
  const minute = minutes % 60;
  const hour = hour24 % 12 || 12;
  return `${hour}${minute ? `:${String(minute).padStart(2, "0")}` : ""} ${hour24 < 12 ? "am" : "pm"}`;
}

export const formatRange = (hours: DayHours) => `${formatTime(hours.open)} – ${formatTime(hours.close)}`;

/** The current weekday (Monday = 0) and minute in India, for a moment in time. */
export function shopClock(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return {
    day: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(part("weekday")),
    minutes: Number(part("hour")) * 60 + Number(part("minute")),
  };
}

/** "Open · Closes 6:30 pm", "Closed · Opens 9:30 am tomorrow", … */
export function openingStatus(week: WeekHours, now: { day: number; minutes: number }) {
  const today = week[now.day];
  if (today && now.minutes >= today.open && now.minutes < today.close) {
    const soon = today.close - now.minutes <= 60;
    return {
      open: true,
      label: `${soon ? "Closes soon" : "Open"} · ${soon ? "" : "Closes "}${formatTime(today.close)}`,
    };
  }
  if (today && now.minutes < today.open) return { open: false, label: `Closed · Opens ${formatTime(today.open)}` };
  for (let ahead = 1; ahead <= 7; ahead++) {
    const day = (now.day + ahead) % 7;
    const hours = week[day];
    if (!hours) continue;
    const when = ahead === 1 ? "tomorrow" : WEEKDAYS[day].slice(0, 3);
    return { open: false, label: `Closed · Opens ${formatTime(hours.open)} ${when}` };
  }
  return { open: false, label: "Closed" };
}

/** "Mon–Sat · 9:30 am – 6:30 pm" when every open day keeps the same hours, else null. */
export function weekSummary(week: WeekHours) {
  const openDays = week.flatMap((hours, day) => (hours ? [{ day, hours }] : []));
  if (openDays.length === 0) return null;
  const { hours } = openDays[0];
  const same = openDays.every((item) => item.hours.open === hours.open && item.hours.close === hours.close);
  const consecutive = openDays.every((item, index) => item.day === openDays[0].day + index);
  if (!same || !consecutive) return null;
  const first = WEEKDAYS[openDays[0].day].slice(0, 3);
  const last = WEEKDAYS[openDays.at(-1)!.day].slice(0, 3);
  const days = openDays.length === 7 ? "Every day" : openDays.length === 1 ? first : `${first}–${last}`;
  return `${days} · ${formatRange(hours)}`;
}
