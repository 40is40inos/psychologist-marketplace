import "server-only";
import type { NotificationKind, Prisma } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient;

interface Target {
  appointmentId: string;
  startsAt: Date;
  user: { id: string; phone: string | null; emailReminders: boolean; smsReminders: boolean };
}

/** Queue confirmation + 24h and 1h reminders for a new or moved booking. */
export async function scheduleBookingNotifications(tx: Tx, t: Target, kind: "booking_confirmation" | "reschedule") {
  const now = new Date();
  const rows: Prisma.NotificationCreateManyInput[] = [
    // Booking emails are transactional: always sent, regardless of reminder settings.
    { userId: t.user.id, appointmentId: t.appointmentId, kind, channel: "email", scheduledFor: now },
  ];
  const reminders: [NotificationKind, number][] = [
    ["reminder_24h", 24],
    ["reminder_1h", 1],
  ];
  for (const [rk, hours] of reminders) {
    const at = new Date(t.startsAt.getTime() - hours * 3_600_000);
    if (at <= now) continue;
    if (t.user.emailReminders) rows.push({ userId: t.user.id, appointmentId: t.appointmentId, kind: rk, channel: "email", scheduledFor: at });
    if (t.user.smsReminders && t.user.phone) rows.push({ userId: t.user.id, appointmentId: t.appointmentId, kind: rk, channel: "sms", scheduledFor: at });
  }
  await tx.notification.createMany({ data: rows });
}

/** Drop reminders that haven't gone out yet (cancel / reschedule). */
export async function cancelPendingReminders(tx: Tx, appointmentId: string) {
  await tx.notification.updateMany({
    where: { appointmentId, status: "pending", kind: { in: ["reminder_24h", "reminder_1h"] } },
    data: { status: "skipped" },
  });
}

export async function queueCancellationEmail(tx: Tx, userId: string, appointmentId: string) {
  await tx.notification.create({
    data: { userId, appointmentId, kind: "cancellation", channel: "email", scheduledFor: new Date() },
  });
}
