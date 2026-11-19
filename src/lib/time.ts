import { currentMarket } from "@/config/market";

/**
 * Time-zone helpers for the market (Europe/Athens). Everything is stored in
 * UTC; working hours and calendar days are defined in local time.
 */
const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: currentMarket.timeZone,
  hourCycle: "h23",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
  weekday: "short",
});

const WEEKDAYS: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

export interface LocalParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  weekday: number; // 1 = Monday
}

export function localParts(date: Date): LocalParts {
  const p = Object.fromEntries(partsFormatter.formatToParts(date).map((x) => [x.type, x.value]));
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour: Number(p.hour),
    minute: Number(p.minute),
    weekday: WEEKDAYS[p.weekday],
  };
}

/** UTC instant for a local wall-clock time in the market. Handles DST. */
export function zonedToUtc(year: number, month: number, day: number, minuteOfDay: number): Date {
  const guess = Date.UTC(year, month - 1, day, 0, minuteOfDay);
  // Offset at the guess, then correct once (enough for 1h DST shifts).
  const offset = (d: number) => {
    const p = localParts(new Date(d));
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - Math.floor(d / 60000) * 60000;
  };
  const first = guess - offset(guess);
  return new Date(guess - offset(first));
}

/** Local calendar date key, e.g. "2026-11-20". */
export function localDateKey(date: Date): string {
  const p = localParts(date);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** Add whole local days to a local date key. */
export function addDaysToKey(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function isoWeekday(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return wd === 0 ? 7 : wd;
}

/** Hours from now until `date` (negative once it has passed). */
export function hoursUntil(date: Date): number {
  return (date.getTime() - Date.now()) / 3_600_000;
}

/** The instant `days` days ago. */
export function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 86_400_000);
}
