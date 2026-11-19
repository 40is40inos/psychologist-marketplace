import { db } from "@/lib/db";
import { brand } from "@/config/brand";
import { buildIcs } from "@/lib/ics";

/**
 * Read-only iCal feed of a psychologist's sessions, for subscribing from
 * Google Calendar or Outlook. The secret token is the only credential, so the
 * feed shows times and formats but never client names or session details.
 */
export async function GET(_req: Request, ctx: RouteContext<"/api/calendar/[token]">) {
  const { token } = await ctx.params;
  if (!/^[\w-]{20,64}$/.test(token)) return new Response("Not found", { status: 404 });
  const profile = await db.psychologistProfile.findUnique({ where: { calendarFeedToken: token }, select: { id: true } });
  if (!profile) return new Response("Not found", { status: 404 });

  const appts = await db.appointment.findMany({
    where: { psychologistId: profile.id, status: { in: ["pending", "confirmed"] }, endsAt: { gte: new Date(Date.now() - 30 * 86_400_000) } },
    orderBy: { startsAt: "asc" },
    take: 500,
    select: { id: true, startsAt: true, endsAt: true, icsSequence: true, sessionType: true, kind: true, status: true },
  });

  const host = new URL(brand.siteUrl).hostname;
  // Build one VCALENDAR with many VEVENTs by reusing the single-event builder.
  const events = appts.map((a) => {
    const label = a.kind === "intro_call" ? "Intro call" : a.sessionType === "in_person" ? "Session (in person)" : a.sessionType === "video" ? "Session (video)" : "Session (phone)";
    const ics = buildIcs(
      { uid: `${a.id}@${host}`, sequence: a.icsSequence, start: a.startsAt, end: a.endsAt, summary: a.status === "pending" ? `${label} – pending` : label, description: `${brand.siteUrl}/dashboard/appointments` },
      brand.name,
    );
    return ics.slice(ics.indexOf("BEGIN:VEVENT"), ics.indexOf("END:VCALENDAR"));
  });
  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${brand.name}//Calendar feed//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${brand.name}`,
    "X-PUBLISHED-TTL:PT15M",
    "",
  ].join("\r\n") + events.join("") + "END:VCALENDAR\r\n";

  return new Response(body, {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "private, max-age=300" },
  });
}
