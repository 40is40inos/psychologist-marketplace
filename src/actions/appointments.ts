"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/auth/session";
import { BookingFailure } from "@/lib/booking";
import { psychologistAction, psychologistReschedule } from "@/lib/booking-psychologist";
import { markPaidAndInvoice } from "@/lib/invoicing";
import { defaultLocale, isLocale } from "@/i18n/config";

async function me() {
  const user = await assertPermission("sessions.manageOwn");
  const p = await db.psychologistProfile.findUniqueOrThrow({ where: { userId: user.id }, select: { id: true } });
  return p.id;
}

const actionSchema = z.object({
  appointmentId: z.string().min(1),
  action: z.enum(["accept", "decline", "no_show", "complete", "cancel"]),
});

/** Accept, decline, cancel, mark no-show or completed. */
export async function appointmentAction(fd: FormData): Promise<void> {
  const psychologistId = await me();
  const { appointmentId, action } = actionSchema.parse(Object.fromEntries(fd));
  try {
    await psychologistAction(psychologistId, appointmentId, action);
  } catch (e) {
    if (!(e instanceof BookingFailure)) throw e;
  }
  refresh();
}

/** Record payment at the session and issue the receipt (myDATA when connected). */
export async function markPaid(fd: FormData): Promise<void> {
  const psychologistId = await me();
  const appointmentId = z.string().min(1).parse(fd.get("appointmentId"));
  const method = fd.get("method") === "card" ? "card" : "cash";
  await markPaidAndInvoice(appointmentId, psychologistId, method);
  refresh();
}

export async function psychologistRescheduleAction(fd: FormData): Promise<void> {
  const psychologistId = await me();
  const l = fd.get("locale");
  const locale = typeof l === "string" && isLocale(l) ? l : defaultLocale;
  const id = z.string().min(1).parse(fd.get("appointmentId"));
  const start = z.iso.datetime().parse(fd.get("start"));
  try {
    await psychologistReschedule(psychologistId, id, new Date(start));
  } catch (e) {
    if (e instanceof BookingFailure) redirect(`/${locale}/dashboard/appointments/${id}/reschedule?error=${e.code}`);
    throw e;
  }
  redirect(`/${locale}/dashboard/appointments`);
}
