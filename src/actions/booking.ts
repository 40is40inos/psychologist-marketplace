"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { SESSION_TYPES } from "@/domain/session-types";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import { getCurrentUser } from "@/lib/auth/session";
import { BookingFailure, cancelBooking, createBooking, rescheduleBooking, type BookingError } from "@/lib/booking";

export interface BookingState {
  error?: BookingError | "invalid";
}

function localeOf(fd: FormData): Locale {
  const l = fd.get("locale");
  return typeof l === "string" && isLocale(l) ? l : defaultLocale;
}

const bookSchema = z.object({
  slug: z.string().min(1).max(80),
  type: z.enum(SESSION_TYPES),
  kind: z.enum(["session", "intro_call"]),
  start: z.iso.datetime(),
  reason: z.string().trim().max(1000).default(""),
  firstTime: z.enum(["yes", "no", ""]).default(""),
  notes: z.string().trim().max(1000).default(""),
  consent: z.literal("on"),
});

export async function bookAction(_prev: BookingState, fd: FormData): Promise<BookingState> {
  const locale = localeOf(fd);
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/sign-in`);
  if (user.role !== "client") return { error: "not_allowed" };

  const parsed = bookSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: "invalid" };
  const d = parsed.data;

  let id: string;
  try {
    const appt = await createBooking({
      clientId: user.id,
      slug: d.slug,
      kind: d.kind,
      type: d.type,
      start: new Date(d.start),
      intake: { reason: d.reason, firstTime: d.firstTime, notes: d.notes },
      locale,
    });
    id = appt.id;
  } catch (e) {
    if (e instanceof BookingFailure) return { error: e.code };
    throw e;
  }
  redirect(`/${locale}/account/appointments/${id}?booked=1`);
}

export async function cancelAction(fd: FormData): Promise<void> {
  const locale = localeOf(fd);
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/sign-in`);
  const id = z.string().min(1).parse(fd.get("appointmentId"));
  try {
    await cancelBooking(user.id, id);
  } catch (e) {
    if (!(e instanceof BookingFailure)) throw e;
  }
  redirect(`/${locale}/account?cancelled=1`);
}

export async function rescheduleAction(fd: FormData): Promise<void> {
  const locale = localeOf(fd);
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/sign-in`);
  const id = z.string().min(1).parse(fd.get("appointmentId"));
  const start = z.iso.datetime().parse(fd.get("start"));
  let movedId: string;
  try {
    movedId = (await rescheduleBooking(user.id, id, new Date(start))).id;
  } catch (e) {
    if (e instanceof BookingFailure) redirect(`/${locale}/account/appointments/${id}/reschedule?error=${e.code}`);
    throw e;
  }
  refresh();
  redirect(`/${locale}/account/appointments/${movedId}?rescheduled=1`);
}
