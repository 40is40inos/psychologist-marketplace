import "server-only";
import { displayName } from "@/lib/slug";
import { db } from "@/lib/db";
import { brand } from "@/config/brand";
import { getDictionary } from "@/i18n/get-dictionary";
import { fill, formatShortDate, formatTime } from "@/lib/format";
import { appointmentIcs } from "@/lib/appointment-ics";
import { sendEmail, sendSms } from "./providers";

const MAX_ATTEMPTS = 5;

/**
 * Send every due notification. Called by /api/cron/notifications (every
 * few minutes in production). Safe to run concurrently-ish: each row is
 * claimed with an attempts bump before sending.
 */
export async function processDueNotifications(limit = 50): Promise<{ sent: number; failed: number; skipped: number }> {
  const due = await db.notification.findMany({
    where: { status: "pending", scheduledFor: { lte: new Date() }, attempts: { lt: MAX_ATTEMPTS } },
    orderBy: { scheduledFor: "asc" },
    take: limit,
    include: {
      user: { select: { email: true, phone: true, locale: true, name: true } },
      appointment: {
        include: {
          client: { select: { name: true } },
          psychologist: {
            select: {
              user: { select: { name: true } },
              offices: { take: 1, select: { addressLine: true, postalCode: true, city: { select: { translations: true } } } },
            },
          },
        },
      },
    },
  });

  const counts = { sent: 0, failed: 0, skipped: 0 };
  for (const n of due) {
    const claimed = await db.notification.updateMany({
      where: { id: n.id, status: "pending", attempts: n.attempts },
      data: { attempts: { increment: 1 } },
    });
    if (!claimed.count) continue;

    const a = n.appointment;
    const isReminder = n.kind === "reminder_24h" || n.kind === "reminder_1h";
    if (isReminder && (!a || !["pending", "confirmed"].includes(a.status))) {
      await db.notification.update({ where: { id: n.id }, data: { status: "skipped" } });
      counts.skipped++;
      continue;
    }

    try {
      const dict = await getDictionary(n.user.locale);
      const t = dict.notifications;
      const tpl = t[n.kind as keyof typeof t] as { subject: string; body: string; sms?: string } | undefined;
      if (!tpl || !a) throw new Error(`No template or appointment for ${n.kind}`);

      const office = a.psychologist.offices[0];
      const where =
        a.sessionType === "in_person" && office
          ? `${office.addressLine}, ${office.postalCode} ${office.city.translations.find((x) => x.locale === n.user.locale)?.name ?? ""}`
          : t.online;
      const vars = {
        name: displayName(a.psychologist.user.name, n.user.locale),
        client: a.client.name,
        when: `${formatShortDate(a.startsAt, n.user.locale)}, ${formatTime(a.startsAt, n.user.locale)}`,
        time: formatTime(a.startsAt, n.user.locale),
        format: a.kind === "intro_call" ? dict.booking.introCall : dict.sessionTypes[a.sessionType].label,
        where,
        url: `${brand.siteUrl}/${n.user.locale}/${n.kind === "psychologist_new_booking" ? "dashboard/appointments" : "account"}`,
        brand: brand.name,
      };

      if (n.channel === "sms") {
        if (!n.user.phone) throw new Error("No phone number");
        await sendSms(n.user.phone, fill(tpl.sms ?? tpl.subject, vars));
      } else {
        const withIcs = ["booking_confirmation", "booking_accepted", "reschedule", "cancellation"].includes(n.kind);
        await sendEmail({
          to: n.user.email,
          subject: fill(tpl.subject, vars),
          text: [fill(tpl.body, vars), "", fill(t.details, vars), "", fill(t.footer, vars)].join("\n"),
          attachments: withIcs
            ? [{ filename: "session.ics", contentType: "text/calendar; charset=utf-8", content: appointmentIcs(a, vars, n.kind === "cancellation") }]
            : undefined,
        });
      }
      await db.notification.update({ where: { id: n.id }, data: { status: "sent", sentAt: new Date(), error: null } });
      counts.sent++;
    } catch (err) {
      const last = n.attempts + 1 >= MAX_ATTEMPTS;
      await db.notification.update({
        where: { id: n.id },
        data: {
          status: last ? "failed" : "pending",
          error: String(err).slice(0, 500),
          // Back off: retry in 5, 10, 20... minutes.
          scheduledFor: new Date(Date.now() + 5 * 60_000 * 2 ** n.attempts),
        },
      });
      counts.failed++;
    }
  }
  return counts;
}
