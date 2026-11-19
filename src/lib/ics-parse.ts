import { zonedToUtc } from "@/lib/time";

/** Pure iCal parsing (no I/O), so it can be unit-tested. */
const HORIZON_DAYS = 90;

interface Busy {
  startsAt: Date;
  endsAt: Date;
}

/** Undo RFC 5545 line folding. */
function unfold(text: string): string[] {
  return text.replace(/\r?\n[ \t]/g, "").split(/\r?\n/);
}

function parseDate(value: string, params: string): { date: Date; allDay: boolean } | null {
  // All-day: 20261124
  if (/VALUE=DATE(?!-)/.test(params) || /^\d{8}$/.test(value)) {
    const [y, m, d] = [value.slice(0, 4), value.slice(4, 6), value.slice(6, 8)].map(Number);
    return { date: zonedToUtc(y, m, d, 0), allDay: true };
  }
  const m = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s, z] = m;
  if (z) return { date: new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s)), allDay: false };
  // Floating or TZID time: interpreted in the market time zone.
  return { date: zonedToUtc(+y, +mo, +d, +h * 60 + +mi), allDay: false };
}

const DAY_CODES = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

/** Expand simple recurrence rules (DAILY/WEEKLY with INTERVAL, COUNT, UNTIL, BYDAY). */
function expand(start: Date, end: Date, rrule: string | null, exdates: Set<number>, until: Date): Busy[] {
  const dur = end.getTime() - start.getTime();
  if (!rrule) return [{ startsAt: start, endsAt: end }];
  const rule = Object.fromEntries(rrule.split(";").map((p) => p.split("=")));
  const freq = rule.FREQ;
  if (freq !== "DAILY" && freq !== "WEEKLY") return [{ startsAt: start, endsAt: end }];
  const interval = Number(rule.INTERVAL ?? 1);
  const count = rule.COUNT ? Number(rule.COUNT) : Infinity;
  const ruleUntil = rule.UNTIL ? parseDate(rule.UNTIL, "")?.date ?? until : until;
  const last = ruleUntil < until ? ruleUntil : until;
  const byDay = rule.BYDAY ? rule.BYDAY.split(",").map((d: string) => DAY_CODES.indexOf(d.slice(-2))) : [start.getUTCDay()];

  const out: Busy[] = [];
  let n = 0;
  for (let t = start.getTime(); t <= last.getTime() && n < count && out.length < 500; t += 86_400_000) {
    const day = new Date(t);
    const daysFromStart = Math.round((t - start.getTime()) / 86_400_000);
    const ok =
      freq === "DAILY"
        ? daysFromStart % interval === 0
        : byDay.includes(day.getUTCDay()) && Math.floor(daysFromStart / 7) % interval === 0;
    if (!ok) continue;
    n++;
    if (!exdates.has(t)) out.push({ startsAt: day, endsAt: new Date(t + dur) });
  }
  return out;
}

export function parseIcsBusy(ics: string, now = new Date()): Busy[] {
  const until = new Date(now.getTime() + HORIZON_DAYS * 86_400_000);
  const busy: Busy[] = [];
  let ev: Record<string, { value: string; params: string }[]> | null = null;

  for (const line of unfold(ics)) {
    if (line === "BEGIN:VEVENT") ev = {};
    else if (line === "END:VEVENT" && ev) {
      const get = (k: string) => ev![k]?.[0];
      const transparent = get("TRANSP")?.value === "TRANSPARENT";
      const cancelled = get("STATUS")?.value === "CANCELLED";
      const s = get("DTSTART") && parseDate(get("DTSTART")!.value, get("DTSTART")!.params);
      const e = get("DTEND") && parseDate(get("DTEND")!.value, get("DTEND")!.params);
      if (s && !transparent && !cancelled) {
        const end = e ? e.date : new Date(s.date.getTime() + (s.allDay ? 86_400_000 : 3_600_000));
        const ex = new Set((ev.EXDATE ?? []).flatMap((x) => x.value.split(",").map((v) => parseDate(v, x.params)?.date.getTime() ?? 0)));
        for (const b of expand(s.date, end, get("RRULE")?.value ?? null, ex, until)) {
          if (b.endsAt > now && b.startsAt < until) busy.push(b);
        }
      }
      ev = null;
    } else if (ev) {
      const idx = line.indexOf(":");
      if (idx < 0) continue;
      const [name, ...params] = line.slice(0, idx).split(";");
      (ev[name] ??= []).push({ value: line.slice(idx + 1), params: params.join(";") });
    }
  }
  return busy;
}

