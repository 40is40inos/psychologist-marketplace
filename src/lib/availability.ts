import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type { SessionType } from "@/domain/session-types";
import { addDaysToKey, isoWeekday, localDateKey, zonedToUtc } from "@/lib/time";

/** The shared client or a transaction, so checks can run inside a booking transaction. */
type Client = Prisma.TransactionClient | typeof db;

/** Default gap after every session when a psychologist hasn't set one. */
export const BUFFER_MINUTES = 10;
export const INTRO_CALL_MINUTES = 15;

export interface Rule {
  weekday: number;
  startMinute: number;
  endMinute: number;
  sessionTypes: SessionType[];
}
export interface Busy {
  startsAt: Date;
  endsAt: Date;
}

export interface SlotQuery {
  rules: Rule[];
  busy: Busy[];
  /** Session format, or null for an intro call (allowed in any window). */
  type: SessionType | null;
  durationMinutes: number;
  /** Minutes kept free after each session (the psychologist's setting). */
  bufferMinutes?: number;
  /** Earliest bookable instant (now + notice). */
  earliest: Date;
  /** Number of local days to look ahead, starting today. */
  days: number;
  /** Stop after this many slots (for "earliest availability"). */
  limit?: number;
}

/** Slot starts align to this grid inside a working window. */
function stepFor(durationMinutes: number, buffer: number): number {
  if (durationMinutes <= 20) return 30;
  return Math.ceil((durationMinutes + buffer) / 30) * 30;
}

/**
 * Pure slot generator: no database access, so it is easy to test. Returns
 * UTC start instants, sorted. Windows can be limited to certain formats,
 * which is how online and in-person hours are kept separate.
 */
export function generateSlots(q: SlotQuery): Date[] {
  const buffer = q.bufferMinutes ?? BUFFER_MINUTES;
  const slots: Date[] = [];
  const step = stepFor(q.durationMinutes, buffer);
  const blockMs = (q.durationMinutes + buffer) * 60_000;
  const today = localDateKey(q.earliest);

  for (let i = 0; i < q.days; i++) {
    const key = addDaysToKey(today, i);
    const weekday = isoWeekday(key);
    const [y, m, d] = key.split("-").map(Number);
    const windows = q.rules.filter(
      (r) => r.weekday === weekday && (q.type === null || r.sessionTypes.length === 0 || r.sessionTypes.includes(q.type)),
    );
    for (const w of windows) {
      for (let minute = w.startMinute; minute + q.durationMinutes <= w.endMinute; minute += step) {
        const start = zonedToUtc(y, m, d, minute);
        if (start < q.earliest) continue;
        const end = new Date(start.getTime() + blockMs);
        const clash = q.busy.some((b) => start < new Date(b.endsAt.getTime() + buffer * 60_000) && end > b.startsAt);
        if (clash) continue;
        slots.push(start);
        if (q.limit && slots.length >= q.limit) return slots.sort((a, b) => +a - +b);
      }
    }
  }
  return slots.sort((a, b) => +a - +b);
}

interface ProfileTiming {
  id: string;
  bookingNoticeHours: number;
  bookingWindowDays: number;
}

interface Schedule {
  rules: Rule[];
  busy: Busy[];
  bufferMinutes: number;
}

/**
 * Load hours, buffer, time off, bookings and synced calendar events for many
 * psychologists at once.
 */
async function loadSchedules(ids: string[], until: Date, client: Client = db): Promise<Map<string, Schedule>> {
  const now = new Date();
  // Sequential on purpose: a transaction client runs one query at a time.
  const profiles = await client.psychologistProfile.findMany({ where: { id: { in: ids } }, select: { id: true, bufferMinutes: true } });
  const rules = await client.availabilityRule.findMany({ where: { psychologistId: { in: ids } } });
  const timeOff = await client.timeOff.findMany({ where: { psychologistId: { in: ids }, endsAt: { gte: now }, startsAt: { lte: until } } });
  const appts = await client.appointment.findMany({
    where: { psychologistId: { in: ids }, status: { in: ["awaiting_payment", "pending", "confirmed"] }, endsAt: { gte: now }, startsAt: { lte: until } },
    select: { psychologistId: true, startsAt: true, endsAt: true },
  });
  const external = await client.externalBusy.findMany({
    where: { calendar: { psychologistId: { in: ids } }, endsAt: { gte: now }, startsAt: { lte: until } },
    select: { startsAt: true, endsAt: true, calendar: { select: { psychologistId: true } } },
  });

  const by = new Map<string, Schedule>(ids.map((id) => [id, { rules: [], busy: [], bufferMinutes: BUFFER_MINUTES }]));
  for (const p of profiles) by.get(p.id)!.bufferMinutes = p.bufferMinutes;
  for (const r of rules) by.get(r.psychologistId)!.rules.push(r);
  for (const t of timeOff) by.get(t.psychologistId)!.busy.push(t);
  for (const a of appts) by.get(a.psychologistId)!.busy.push(a);
  for (const e of external) by.get(e.calendar.psychologistId)!.busy.push(e);
  return by;
}

/** Bookable slots for one psychologist and format. */
export async function getSlots(
  profile: ProfileTiming,
  type: SessionType | null,
  durationMinutes: number,
  client: Client = db,
): Promise<Date[]> {
  const now = new Date();
  const until = new Date(now.getTime() + profile.bookingWindowDays * 86_400_000);
  const schedule = (await loadSchedules([profile.id], until, client)).get(profile.id)!;
  return generateSlots({
    ...schedule,
    type,
    durationMinutes,
    earliest: new Date(now.getTime() + profile.bookingNoticeHours * 3_600_000),
    days: profile.bookingWindowDays,
  });
}

/** Is this exact start still free? Re-checked inside the booking transaction. */
export async function isSlotFree(
  profile: ProfileTiming,
  type: SessionType | null,
  durationMinutes: number,
  start: Date,
  client: Client = db,
): Promise<boolean> {
  const slots = await getSlots(profile, type, durationMinutes, client);
  return slots.some((s) => s.getTime() === start.getTime());
}

/** Earliest slot per psychologist (any active format), for search results. */
export async function earliestSlots(
  profiles: (ProfileTiming & { minDuration: number })[],
  lookaheadDays = 28,
  /** Look from this instant instead of now (e.g. a date picked in search). */
  from?: Date,
): Promise<Map<string, Date | null>> {
  const now = new Date();
  const start = from && from > now ? from : now;
  const until = new Date(start.getTime() + lookaheadDays * 86_400_000);
  const schedules = await loadSchedules(profiles.map((p) => p.id), until);
  const result = new Map<string, Date | null>();
  for (const p of profiles) {
    const notice = new Date(now.getTime() + p.bookingNoticeHours * 3_600_000);
    const [first] = generateSlots({
      ...schedules.get(p.id)!,
      type: null,
      durationMinutes: p.minDuration,
      earliest: notice > start ? notice : start,
      days: Math.min(lookaheadDays, p.bookingWindowDays),
      limit: 1,
    });
    result.set(p.id, first ?? null);
  }
  return result;
}

/** Group slots by local date key for calendar display. */
export function groupByDay(slots: Date[]): Record<string, Date[]> {
  const out: Record<string, Date[]> = {};
  for (const s of slots) (out[localDateKey(s)] ??= []).push(s);
  return out;
}
