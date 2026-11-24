import "server-only";
import { DEMO_ACCOUNTS } from "@/config/demo";
import { db } from "@/lib/db";
import { addDaysToKey, isoWeekday, localDateKey, zonedToUtc } from "@/lib/time";

/** Next weekday at least `days` ahead, at a local (Athens) time. */
function upcoming(days: number, hour: number): Date {
  let key = addDaysToKey(localDateKey(new Date()), days);
  while (isoWeekday(key) > 5) key = addDaysToKey(key, 1);
  const [y, m, d] = key.split("-").map(Number);
  return zonedToUtc(y, m, d, hour * 60);
}

/**
 * Keeps the demo alive between deploys: the seeded bookings were made
 * relative to the deploy date and drift into the past. When the demo client
 * has fewer than two upcoming sessions with the demo psychologist, add two
 * confirmed sessions and one request awaiting confirmation.
 */
export async function refreshDemoBookings(): Promise<void> {
  const [client, psychologist] = await Promise.all([
    db.user.findUnique({ where: { email: DEMO_ACCOUNTS.client }, select: { id: true } }),
    db.psychologistProfile.findFirst({
      where: { user: { email: DEMO_ACCOUNTS.psychologist } },
      select: { id: true, offerings: { where: { active: true }, select: { type: true, durationMinutes: true, priceCents: true } } },
    }),
  ]);
  if (!client || !psychologist || psychologist.offerings.length === 0) return;

  const now = new Date();
  const ahead = await db.appointment.count({
    where: { clientId: client.id, psychologistId: psychologist.id, startsAt: { gt: now }, status: { in: ["pending", "confirmed"] } },
  });
  if (ahead >= 2) return;

  const offering = (type: string) => psychologist.offerings.find((o) => o.type === type) ?? psychologist.offerings[0];
  const plan = [
    { start: upcoming(2, 10), o: offering("in_person"), status: "confirmed" as const },
    { start: upcoming(4, 18), o: offering("video"), status: "pending" as const },
    { start: upcoming(7, 10), o: offering("video"), status: "confirmed" as const },
  ];
  for (const { start, o, status } of plan) {
    const end = new Date(start.getTime() + o.durationMinutes * 60_000);
    // Never on top of a booking a visitor made.
    const clash = await db.appointment.count({
      where: { psychologistId: psychologist.id, status: { in: ["awaiting_payment", "pending", "confirmed"] }, startsAt: { lt: end }, endsAt: { gt: start } },
    });
    if (clash) continue;
    await db.appointment.create({
      data: {
        clientId: client.id, psychologistId: psychologist.id, sessionType: o.type, status, startsAt: start, endsAt: end,
        priceCents: o.priceCents, locale: "el",
        payment: { create: { amountCents: o.priceCents, method: "pay_at_session", status: "pending" } },
      },
    });
  }
}
