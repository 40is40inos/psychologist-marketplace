"use server";

import { redirect } from "next/navigation";
import { brand } from "@/config/brand";
import { refresh } from "next/cache";
import { z } from "zod";
import { SESSION_TYPES } from "@/domain/session-types";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import { getCurrentUser } from "@/lib/auth/session";
import { BookingFailure, cancelBooking, createBooking, rescheduleBooking, type BookingError } from "@/lib/booking";
import { hasConsent } from "@/lib/consent";
import { releaseHold } from "@/lib/card-booking";
import { db } from "@/lib/db";
import { CHECKOUT_HOLD_MINUTES, cardPaymentsEnabled, checkoutUrl, createCheckout } from "@/lib/payments";

export interface BookingState {
  error?: BookingError | "invalid" | "consent" | "payment";
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
  paymentMethod: z.enum(["pay_at_session", "card"]).default("pay_at_session"),
});

export async function bookAction(_prev: BookingState, fd: FormData): Promise<BookingState> {
  const locale = localeOf(fd);
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/sign-in`);
  if (user.role !== "client") return { error: "not_allowed" };
  if (!(await hasConsent(user.id, "health_data"))) return { error: "consent" };

  const parsed = bookSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: "invalid" };
  const d = parsed.data;

  const payOnline = d.paymentMethod === "card" && d.kind === "session" && cardPaymentsEnabled();
  let id: string;
  let checkout: string | null = null;
  try {
    const appt = await createBooking({
      clientId: user.id,
      slug: d.slug,
      kind: d.kind,
      type: d.type,
      start: new Date(d.start),
      intake: { reason: d.reason, firstTime: d.firstTime, notes: d.notes },
      locale,
      payOnline,
    });
    id = appt.id;
    if (appt.online) {
      try {
        const s = await createCheckout({
          appointmentId: appt.id,
          amountCents: appt.priceCents,
          description: `${brand.name} booking`,
          email: user.email,
          locale,
          manualCapture: appt.pending,
          expiresAt: new Date(Date.now() + CHECKOUT_HOLD_MINUTES * 60_000),
        });
        await db.payment.update({ where: { appointmentId: appt.id }, data: { providerRef: s.id } });
        checkout = s.url;
      } catch (e) {
        console.error("[payments] checkout failed", e);
        await releaseHold(appt.id);
        return { error: "payment" };
      }
    }
  } catch (e) {
    if (e instanceof BookingFailure) return { error: e.code };
    throw e;
  }
  // Card details are entered on the provider's page (3-D Secure there too).
  if (checkout) redirect(checkout);
  redirect(`/${locale}/account/appointments/${id}?booked=1`);
}

/** Reopen the checkout for a held booking, or release it if the checkout expired. */
export async function resumePayment(fd: FormData): Promise<void> {
  const locale = localeOf(fd);
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/sign-in`);
  const id = z.string().min(1).parse(fd.get("appointmentId"));
  const a = await db.appointment.findFirst({ where: { id, clientId: user.id, status: "awaiting_payment" }, include: { payment: true } });
  if (!a) redirect(`/${locale}/account/appointments/${id}`);
  const ref = a.payment?.providerRef;
  const url = ref?.startsWith("cs_") && cardPaymentsEnabled() ? await checkoutUrl(ref).catch(() => null) : null;
  if (url) redirect(url);
  await releaseHold(a.id);
  refresh();
  redirect(`/${locale}/account/appointments/${id}?payment=expired`);
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
