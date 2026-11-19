import "server-only";
import { db } from "@/lib/db";
import { INTRO_CALL_MINUTES, isSlotFree } from "@/lib/availability";
import { encrypt } from "@/lib/crypto";
import { cancelPendingReminders, queueCancellationEmail, scheduleBookingNotifications } from "@/lib/notifications/schedule";
import type { SessionType } from "@/domain/session-types";
import type { Locale } from "@/i18n/config";

export type BookingError = "slot_taken" | "not_bookable" | "intro_unavailable" | "intro_used" | "not_allowed" | "too_late";

export class BookingFailure extends Error {
  constructor(public code: BookingError) {
    super(code);
  }
}

export interface Intake {
  reason: string;
  firstTime: "yes" | "no" | "";
  notes: string;
}

/**
 * Serialise bookings per psychologist with a transaction-scoped advisory
 * lock, then re-check the slot. Two people clicking the same slot at the
 * same time get one booking and one "slot taken".
 */
async function lockPsychologist(tx: Parameters<Parameters<typeof db.$transaction>[0]>[0], psychologistId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${psychologistId}))`;
}

export async function createBooking(input: {
  clientId: string;
  slug: string;
  kind: "session" | "intro_call";
  type: SessionType;
  start: Date;
  intake: Intake;
  locale: Locale;
}) {
  return db.$transaction(
    async (tx) => {
      const profile = await tx.psychologistProfile.findFirst({
        where: { slug: input.slug, verificationStatus: "verified", published: true, user: { status: "active" } },
        select: {
          id: true, bookingNoticeHours: true, bookingWindowDays: true, introCallEnabled: true,
          offerings: { where: { active: true, type: input.type } },
        },
      });
      const offering = profile?.offerings[0];
      if (!profile || !offering) throw new BookingFailure("not_bookable");
      if (input.kind === "intro_call") {
        if (!profile.introCallEnabled || input.type === "in_person") throw new BookingFailure("intro_unavailable");
        const used = await tx.appointment.count({
          where: { clientId: input.clientId, psychologistId: profile.id, kind: "intro_call", status: { notIn: ["cancelled_by_client", "cancelled_by_psychologist"] } },
        });
        if (used) throw new BookingFailure("intro_used");
      }

      await lockPsychologist(tx, profile.id);
      const duration = input.kind === "intro_call" ? INTRO_CALL_MINUTES : offering.durationMinutes;
      const free = await isSlotFree(profile, input.kind === "intro_call" ? null : input.type, duration, input.start, tx);
      if (!free) throw new BookingFailure("slot_taken");

      const priceCents = input.kind === "intro_call" ? 0 : offering.priceCents;
      const appointment = await tx.appointment.create({
        data: {
          clientId: input.clientId,
          psychologistId: profile.id,
          sessionType: input.type,
          kind: input.kind,
          status: "confirmed",
          startsAt: input.start,
          endsAt: new Date(input.start.getTime() + duration * 60_000),
          priceCents,
          locale: input.locale,
          paymentMethod: "pay_at_session",
          intakeEncrypted: input.intake.reason || input.intake.notes ? encrypt(JSON.stringify(input.intake)) : null,
          payment: {
            create: { amountCents: priceCents, method: "pay_at_session", status: priceCents === 0 ? "waived" : "pending" },
          },
        },
        select: { id: true, startsAt: true },
      });

      // Messaging opens once there is a booking.
      await tx.conversation.upsert({
        where: { clientId_psychologistId: { clientId: input.clientId, psychologistId: profile.id } },
        create: { clientId: input.clientId, psychologistId: profile.id },
        update: {},
      });

      const user = await tx.user.findUniqueOrThrow({
        where: { id: input.clientId },
        select: { id: true, phone: true, emailReminders: true, smsReminders: true },
      });
      await scheduleBookingNotifications(tx, { appointmentId: appointment.id, startsAt: appointment.startsAt, user }, "booking_confirmation");
      return appointment;
    },
    { timeout: 15_000 },
  );
}

/** Hours left before the session; negative once it has started. */
function hoursUntil(d: Date): number {
  return (d.getTime() - Date.now()) / 3_600_000;
}

export async function cancelBooking(clientId: string, appointmentId: string) {
  return db.$transaction(async (tx) => {
    const a = await tx.appointment.findFirst({
      where: { id: appointmentId, clientId, status: { in: ["pending", "confirmed"] } },
      select: { id: true, startsAt: true, kind: true, psychologist: { select: { cancellationHours: true } } },
    });
    if (!a || hoursUntil(a.startsAt) <= 0) throw new BookingFailure("not_allowed");
    const late = a.kind === "session" && hoursUntil(a.startsAt) < a.psychologist.cancellationHours;

    await tx.appointment.update({
      where: { id: a.id },
      data: { status: "cancelled_by_client", cancelledAt: new Date(), lateCancellation: late, icsSequence: { increment: 1 } },
    });
    // Free cancellation voids the pending payment; a late one stays due per policy.
    if (!late) await tx.payment.updateMany({ where: { appointmentId: a.id, status: "pending" }, data: { status: "waived" } });
    await cancelPendingReminders(tx, a.id);
    await queueCancellationEmail(tx, clientId, a.id);
    return { late };
  });
}

/** Move a session to a new slot. Only allowed before the free-cancellation window closes. */
export async function rescheduleBooking(clientId: string, appointmentId: string, newStart: Date) {
  return db.$transaction(
    async (tx) => {
      const a = await tx.appointment.findFirst({
        where: { id: appointmentId, clientId, status: { in: ["pending", "confirmed"] } },
        include: {
          payment: true,
          psychologist: { select: { id: true, cancellationHours: true, bookingNoticeHours: true, bookingWindowDays: true } },
        },
      });
      if (!a) throw new BookingFailure("not_allowed");
      if (hoursUntil(a.startsAt) < a.psychologist.cancellationHours) throw new BookingFailure("too_late");

      await lockPsychologist(tx, a.psychologist.id);
      const duration = (a.endsAt.getTime() - a.startsAt.getTime()) / 60_000;
      const free = await isSlotFree(a.psychologist, a.kind === "intro_call" ? null : a.sessionType, duration, newStart, tx);
      if (!free) throw new BookingFailure("slot_taken");

      await tx.appointment.update({
        where: { id: a.id },
        data: { status: "cancelled_by_client", cancelledAt: new Date(), icsSequence: { increment: 1 } },
      });
      await cancelPendingReminders(tx, a.id);
      const moved = await tx.appointment.create({
        data: {
          clientId,
          psychologistId: a.psychologistId,
          sessionType: a.sessionType,
          kind: a.kind,
          status: "confirmed",
          startsAt: newStart,
          endsAt: new Date(newStart.getTime() + duration * 60_000),
          priceCents: a.priceCents,
          locale: a.locale,
          paymentMethod: a.paymentMethod,
          intakeEncrypted: a.intakeEncrypted,
          rescheduledFromId: a.id,
        },
        select: { id: true, startsAt: true },
      });
      // The payment follows the session.
      if (a.payment) await tx.payment.update({ where: { id: a.payment.id }, data: { appointmentId: moved.id } });

      const user = await tx.user.findUniqueOrThrow({
        where: { id: clientId },
        select: { id: true, phone: true, emailReminders: true, smsReminders: true },
      });
      await scheduleBookingNotifications(tx, { appointmentId: moved.id, startsAt: moved.startsAt, user }, "reschedule");
      return moved;
    },
    { timeout: 15_000 },
  );
}
