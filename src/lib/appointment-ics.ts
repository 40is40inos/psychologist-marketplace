import { brand } from "@/config/brand";
import { buildIcs } from "@/lib/ics";

/** .ics for an appointment, shared by emails and the download route. */
export function appointmentIcs(
  a: { id: string; startsAt: Date; endsAt: Date; icsSequence: number },
  v: { name: string; format: string; where: string; url: string },
  cancelled = false,
): string {
  const host = new URL(brand.siteUrl).hostname;
  return buildIcs(
    {
      uid: `${a.id}@${host}`,
      sequence: a.icsSequence,
      start: a.startsAt,
      end: a.endsAt,
      summary: `${v.format} · ${v.name}`,
      description: `${v.format} · ${v.name}\n${v.url}`,
      location: v.where,
      url: v.url,
      cancelled,
    },
    brand.name,
  );
}
