import "server-only";
import { db } from "@/lib/db";
import { isSlotFree } from "@/lib/availability";
import { BookingFailure } from "@/lib/booking";
import { cancelPendingReminders, queueNotification, scheduleBookingNotifications } from "@/lib/notifications/schedule";

/**
 * Appointment actions taken by the psychologist. Every function checks that
 * the appointment belongs to this psychologist.
 */
type Action = "accept" | "decline" | "no_show" | "complete" | "cancel";

const clientPrefs = { id: true, phone: true, emailReminders: true, smsReminders: true } as const;

export async function psychologistAction(psychologistId: string, appointmentId: string, action: Action) {
  return db.$transaction(async (tx) => {
    const a = await tx.appointment.findFirst({
      where: { id: appointmentId, psychologistId },
      include: { client: { select: clientPrefs } },
    });
    if (!a) throw new BookingFailure("not_allowed");
    const started = a.startsAt.getTime() <= Date.now();

    switch (action) {
      case "accept": {
        if (a.status !== "pending" || started) throw new BookingFailure("not_allowed");
        await tx.appointment.update({ where: { id: a.id }, data: { status: "confirmed", icsSequence: { increment: 1 } } });
        await queueNotification(tx, a.clientId, a.id, "booking_accepted");
        // Reminders start now that the booking is confirmed.
        await scheduleBookingNotifications(tx, { appointmentId: a.id, startsAt: a.startsAt, user: a.client }, "booking_confirmation");
        await tx.notification.updateMany({ where: { appointmentId: a.id, kind: "booking_confirmation", status: "pending" }, data: { status: "skipped" } });
        return;
      }
      case "decline":
      case "cancel": {
        if (!["pending", "confirmed"].includes(a.status) || started) throw new BookingFailure("not_allowed");
        await tx.appointment.update({
          where: { id: a.id },
          data: { status: "cancelled_by_psychologist", cancelledAt: new Date(), icsSequence: { increment: 1 } },
        });
        // The client never pays for a session the psychologist cancels.
        await tx.payment.updateMany({ where: { appointmentId: a.id, status: "pending" }, data: { status: "waived" } });
        await cancelPendingReminders(tx, a.id);
        await queueNotification(tx, a.clientId, a.id, action === "decline" ? "booking_declined" : "cancellation");
        return;
      }
      case "no_show":
      case "complete": {
        if (a.status !== "confirmed" || !started) throw new BookingFailure("not_allowed");
        await tx.appointment.update({ where: { id: a.id }, data: { status: action === "no_show" ? "no_show" : "completed" } });
        return;
      }
    }
  });
}

/** Move a session to a new free slot (psychologist side; no cancellation window). */
export async function psychologistReschedule(psychologistId: string, appointmentId: string, newStart: Date) {
  return db.$transaction(
    async (tx) => {
      const a = await tx.appointment.findFirst({
        where: { id: appointmentId, psychologistId, status: { in: ["pending", "confirmed"] } },
        include: { payment: true, client: { select: clientPrefs }, psychologist: { select: { id: true, bookingWindowDays: true } } },
      });
      if (!a || a.startsAt.getTime() <= Date.now()) throw new BookingFailure("not_allowed");

      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${psychologistId}))`;
      const duration = (a.endsAt.getTime() - a.startsAt.getTime()) / 60_000;
      // The psychologist may offer times inside their own notice period.
      const free = await isSlotFree({ id: psychologistId, bookingNoticeHours: 0, bookingWindowDays: a.psychologist.bookingWindowDays }, a.kind === "intro_call" ? null : a.sessionType, duration, newStart, tx);
      if (!free) throw new BookingFailure("slot_taken");

      await tx.appointment.update({ where: { id: a.id }, data: { status: "cancelled_by_psychologist", cancelledAt: new Date(), icsSequence: { increment: 1 } } });
      await cancelPendingReminders(tx, a.id);
      const moved = await tx.appointment.create({
        data: {
          clientId: a.clientId,
          psychologistId,
          sessionType: a.sessionType,
          kind: a.kind,
          status: "confirmed",
          startsAt: newStart,
          endsAt: new Date(newStart.getTime() + duration * 60_000),
          priceCents: a.priceCents,
          locale: a.locale,
          paymentMethod: a.paymentMethod,
          intakeEncrypted: a.intakeEncrypted,
          intakeRisk: a.intakeRisk,
          rescheduledFromId: a.id,
        },
      });
      if (a.payment) await tx.payment.update({ where: { id: a.payment.id }, data: { appointmentId: moved.id } });
      await scheduleBookingNotifications(tx, { appointmentId: moved.id, startsAt: moved.startsAt, user: a.client }, "reschedule");
      return moved;
    },
    { timeout: 15_000 },
  );
}
