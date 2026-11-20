import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { releaseHold } from "@/lib/card-booking";

/**
 * Data minimisation (GDPR Art. 5(1)(e)): deletes data we no longer need and
 * releases slots held by unpaid online checkouts. Run hourly with:
 *   Authorization: Bearer $CRON_SECRET
 */
const DAY = 86_400_000;

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!secret || given.length !== secret.length || !timingSafeEqual(Buffer.from(given), Buffer.from(secret))) {
    return new Response("Unauthorized", { status: 401 });
  }
  const now = Date.now();

  // Unpaid card checkouts: cancel the hold so the slot is bookable again.
  const expired = await db.payment.findMany({
    where: { method: "card", status: "pending", expiresAt: { lt: new Date(now) }, appointment: { status: "awaiting_payment" } },
    select: { appointmentId: true },
  });
  // Stripe also sends checkout.session.expired; whichever comes first wins.
  for (const p of expired) await releaseHold(p.appointmentId);

  const [sessions, signals, searches, notifications, rateLimits] = await db.$transaction([
    db.authSession.deleteMany({ where: { expiresAt: { lt: new Date(now) } } }),
    db.videoSignal.deleteMany({ where: { createdAt: { lt: new Date(now - DAY) } } }),
    db.searchLog.deleteMany({ where: { createdAt: { lt: new Date(now - 395 * DAY) } } }),
    db.notification.deleteMany({ where: { status: { in: ["sent", "skipped", "failed"] }, createdAt: { lt: new Date(now - 365 * DAY) } } }),
    db.rateLimit.deleteMany({ where: { resetAt: { lt: new Date(now) } } }),
  ]);

  return Response.json({
    releasedHolds: expired.length,
    deleted: { sessions: sessions.count, videoSignals: signals.count, searchLogs: searches.count, notifications: notifications.count, rateLimits: rateLimits.count },
  });
}

export const GET = POST;
