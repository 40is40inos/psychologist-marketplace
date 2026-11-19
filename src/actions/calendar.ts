"use server";

import { randomBytes } from "node:crypto";
import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { assertPermission } from "@/lib/auth/session";
import { hasFeature } from "@/lib/plans";
import { isAllowedCalendarUrl, syncCalendar } from "@/lib/calendar-sync";
import { zonedToUtc } from "@/lib/time";
import { SESSION_TYPES } from "@/domain/session-types";

export interface CalState {
  ok?: boolean;
  error?: "invalid" | "range" | "url" | "locked" | "sync";
  detail?: string;
  at?: number;
}
const done = (): CalState => ({ ok: true, at: Date.now() });
const fail = (error: CalState["error"], detail?: string): CalState => ({ error, detail, at: Date.now() });

async function me() {
  const user = await assertPermission("availability.editOwn");
  const p = await db.psychologistProfile.findUniqueOrThrow({ where: { userId: user.id }, select: { id: true } });
  return p.id;
}

// ─── Weekly hours ───────────────────────────────────────────────────────────

const rangeSchema = z.object({
  weekday: z.number().int().min(1).max(7),
  start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$|^24:00$/),
  types: z.array(z.enum(SESSION_TYPES)),
});
const toMin = (hm: string) => Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3, 5));

/** Replaces all weekly hours. The client sends the full schedule as JSON. */
export async function saveWeeklyHours(_p: CalState, fd: FormData): Promise<CalState> {
  const psychologistId = await me();
  let raw: unknown;
  try {
    raw = JSON.parse(String(fd.get("schedule") ?? "[]"));
  } catch {
    return fail("invalid");
  }
  const parsed = z.array(rangeSchema).max(50).safeParse(raw);
  if (!parsed.success) return fail("invalid");
  const rows = parsed.data.map((r) => ({ weekday: r.weekday, startMinute: toMin(r.start), endMinute: toMin(r.end), sessionTypes: r.types }));
  if (rows.some((r) => r.endMinute <= r.startMinute)) return fail("range");

  await db.$transaction([
    db.availabilityRule.deleteMany({ where: { psychologistId } }),
    db.availabilityRule.createMany({ data: rows.map((r) => ({ psychologistId, ...r })) }),
  ]);
  refresh();
  return done();
}

// ─── Booking rules ──────────────────────────────────────────────────────────

const rulesSchema = z.object({
  bufferMinutes: z.coerce.number().int().min(0).max(60),
  bookingNoticeHours: z.coerce.number().int().min(0).max(168),
  bookingWindowDays: z.coerce.number().int().min(7).max(180),
  cancellationHours: z.coerce.number().int().min(0).max(168),
  lateCancellationFeePercent: z.coerce.number().int().min(0).max(100),
});

export async function saveBookingRules(_p: CalState, fd: FormData): Promise<CalState> {
  const psychologistId = await me();
  const parsed = rulesSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return fail("invalid");
  await db.psychologistProfile.update({
    where: { id: psychologistId },
    data: { ...parsed.data, requiresApproval: fd.get("requiresApproval") === "on" },
  });
  refresh();
  return done();
}

// ─── Availability exceptions (time off and extra hours) ─────────────────────

const localDateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
const fromLocal = (v: string) => {
  const [d, t] = v.split("T");
  const [y, m, day] = d.split("-").map(Number);
  return zonedToUtc(y, m, day, toMin(t));
};

export async function addException(_p: CalState, fd: FormData): Promise<CalState> {
  const psychologistId = await me();
  const parsed = z
    .object({ start: localDateTime, end: localDateTime, kind: z.enum(["unavailable", "available"]).default("unavailable"), note: z.string().trim().max(200).default("") })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success) return fail("invalid");
  const startsAt = fromLocal(parsed.data.start);
  const endsAt = fromLocal(parsed.data.end);
  if (endsAt <= startsAt) return fail("range");
  await db.availabilityException.create({ data: { psychologistId, kind: parsed.data.kind, startsAt, endsAt, note: parsed.data.note || null } });
  refresh();
  return done();
}

export async function removeException(fd: FormData): Promise<void> {
  const psychologistId = await me();
  await db.availabilityException.deleteMany({ where: { id: String(fd.get("id")), psychologistId } });
  refresh();
}

// ─── Calendar sync ──────────────────────────────────────────────────────────

export async function connectCalendar(_p: CalState, fd: FormData): Promise<CalState> {
  const psychologistId = await me();
  if (!(await hasFeature(psychologistId, "calendar_sync"))) return fail("locked");
  const url = String(fd.get("url") ?? "").trim();
  const label = String(fd.get("label") ?? "").trim().slice(0, 60) || "Calendar";
  if (!isAllowedCalendarUrl(url)) return fail("url");
  const cal = await db.externalCalendar.create({ data: { psychologistId, label, urlEncrypted: encrypt(url) } });
  const result = await syncCalendar(cal.id);
  refresh();
  return result.ok ? done() : fail("sync", result.error);
}

export async function syncCalendarNow(fd: FormData): Promise<void> {
  const psychologistId = await me();
  const cal = await db.externalCalendar.findFirst({ where: { id: String(fd.get("id")), psychologistId } });
  if (cal) await syncCalendar(cal.id);
  refresh();
}

export async function disconnectCalendar(fd: FormData): Promise<void> {
  const psychologistId = await me();
  await db.externalCalendar.deleteMany({ where: { id: String(fd.get("id")), psychologistId } });
  refresh();
}

/** New secret feed address; the old one stops working immediately. */
export async function resetFeedToken(): Promise<void> {
  const psychologistId = await me();
  await db.psychologistProfile.update({ where: { id: psychologistId }, data: { calendarFeedToken: randomBytes(24).toString("base64url") } });
  refresh();
}
