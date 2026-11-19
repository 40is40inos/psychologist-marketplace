import "server-only";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { parseIcsBusy } from "@/lib/ics-parse";

/**
 * Calendar sync without OAuth: the psychologist pastes the secret iCal
 * address from Google Calendar ("Secret address in iCal format") or Outlook
 * ("Publish calendar" → ICS). We import busy times so those slots can't be
 * booked, and publish our own feed (/api/calendar/<token>) they can
 * subscribe to. Two-way OAuth sync can replace this later.
 */
/** Only fetch public https URLs (no internal addresses). */
function safeUrl(raw: string): URL | null {
  try {
    const u = new URL(raw.replace(/^webcal:/i, "https:"));
    if (u.protocol !== "https:") return null;
    if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|\[?::1|0\.)/.test(u.hostname) || /^172\.(1[6-9]|2\d|3[01])\./.test(u.hostname)) return null;
    return u;
  } catch {
    return null;
  }
}

export function isAllowedCalendarUrl(raw: string): boolean {
  return safeUrl(raw) !== null;
}

export async function syncCalendar(calendarId: string): Promise<{ ok: boolean; events?: number; error?: string }> {
  const cal = await db.externalCalendar.findUnique({ where: { id: calendarId } });
  if (!cal) return { ok: false, error: "not_found" };
  const url = safeUrl(decrypt(cal.urlEncrypted));
  try {
    if (!url) throw new Error("Calendar URL must be a public https address");
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000), redirect: "follow" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = (await res.text()).slice(0, 5_000_000);
    if (!text.includes("BEGIN:VCALENDAR")) throw new Error("Not an iCal file");
    const busy = parseIcsBusy(text);
    await db.$transaction([
      db.externalBusy.deleteMany({ where: { calendarId } }),
      db.externalBusy.createMany({ data: busy.map((b) => ({ calendarId, ...b })) }),
      db.externalCalendar.update({ where: { id: calendarId }, data: { lastSyncedAt: new Date(), lastError: null } }),
    ]);
    return { ok: true, events: busy.length };
  } catch (e) {
    await db.externalCalendar.update({ where: { id: calendarId }, data: { lastError: String(e).slice(0, 300) } });
    return { ok: false, error: String(e) };
  }
}

/** Sync every connected calendar (called from the cron route). */
export async function syncAllCalendars(): Promise<number> {
  const cals = await db.externalCalendar.findMany({ select: { id: true } });
  for (const c of cals) await syncCalendar(c.id);
  return cals.length;
}
