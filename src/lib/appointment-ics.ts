import { brand } from "@/config/brand";
import { buildIcs } from "@/lib/ics";

/**
 * .ics for an appointment, shared by emails and the download route.
 * Discreet by design: a neutral title ("Appointment"), no names, no session
 * type, so nothing sensitive shows up in shared or synced calendars.
 */
export function appointmentIcs(
  a: { id: string; startsAt: Date; endsAt: Date; icsSequence: number },
  v: { title: string; where?: string; url: string },
  cancelled = false,
): string {
  const host = new URL(brand.siteUrl).hostname;
  return buildIcs(
    {
      uid: `${a.id}@${host}`,
      sequence: a.icsSequence,
      start: a.startsAt,
      end: a.endsAt,
      summary: v.title,
      description: v.url,
      location: v.where,
      url: v.url,
      cancelled,
    },
    brand.name,
  );
}
