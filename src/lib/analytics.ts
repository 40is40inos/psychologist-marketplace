import "server-only";
import { db } from "@/lib/db";
import { localDateKey } from "@/lib/time";

export type StatField = "views" | "searchAppearances" | "bookingStarts" | "bookings";

const COLUMN: Record<StatField, string> = {
  views: '"views"',
  searchAppearances: '"searchAppearances"',
  bookingStarts: '"bookingStarts"',
  bookings: '"bookings"',
};

/**
 * Increment today's counter for one or more psychologists in one statement.
 * Fire-and-forget: analytics must never break a page.
 */
export function track(psychologistIds: string[], field: StatField): void {
  if (!psychologistIds.length) return;
  const day = localDateKey(new Date());
  const col = COLUMN[field];
  db.$executeRawUnsafe(
    `INSERT INTO "ProfileStat" ("psychologistId", "date", ${col})
     SELECT id, $2::date, 1 FROM unnest($1::text[]) AS id
     ON CONFLICT ("psychologistId", "date") DO UPDATE SET ${col} = "ProfileStat".${col} + 1`,
    psychologistIds,
    day,
  ).catch((e) => console.warn("[analytics]", String(e).slice(0, 200)));
}

export interface StatsSummary {
  days: { date: string; views: number; searchAppearances: number; bookingStarts: number; bookings: number }[];
  totals: { views: number; searchAppearances: number; bookingStarts: number; bookings: number };
  /** Bookings per profile view. */
  conversion: number;
}

export async function statsFor(psychologistId: string, days = 30): Promise<StatsSummary> {
  const from = new Date(Date.now() - (days - 1) * 86_400_000);
  const rows = await db.profileStat.findMany({
    where: { psychologistId, date: { gte: new Date(localDateKey(from)) } },
    orderBy: { date: "asc" },
  });
  const byDay = new Map(rows.map((r) => [r.date.toISOString().slice(0, 10), r]));
  const list = Array.from({ length: days }, (_, i) => {
    const key = localDateKey(new Date(from.getTime() + i * 86_400_000));
    const r = byDay.get(key);
    return { date: key, views: r?.views ?? 0, searchAppearances: r?.searchAppearances ?? 0, bookingStarts: r?.bookingStarts ?? 0, bookings: r?.bookings ?? 0 };
  });
  const totals = list.reduce(
    (t, d) => ({ views: t.views + d.views, searchAppearances: t.searchAppearances + d.searchAppearances, bookingStarts: t.bookingStarts + d.bookingStarts, bookings: t.bookings + d.bookings }),
    { views: 0, searchAppearances: 0, bookingStarts: 0, bookings: 0 },
  );
  return { days: list, totals, conversion: totals.views ? totals.bookings / totals.views : 0 };
}

/**
 * Anonymous search log (query text and filters only, no user id) for the
 * admin "top searches" and "no results" reports. Fire-and-forget.
 */
export function logSearch(query: string, filters: Record<string, unknown>, resultCount: number, locale: "el" | "en"): void {
  const q = query.trim().toLowerCase().slice(0, 80);
  const active = Object.fromEntries(Object.entries(filters).filter(([, v]) => (Array.isArray(v) ? v.length > 0 : v != null && v !== "")));
  if (!q && Object.keys(active).length === 0) return; // plain browsing isn't a search
  db.searchLog
    .create({ data: { query: q, filters: active as object, resultCount, locale } })
    .catch((e) => console.warn("[search-log]", String(e).slice(0, 200)));
}
