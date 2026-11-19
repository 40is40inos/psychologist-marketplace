import "server-only";
import { connection } from "next/server";
import { getSlots, INTRO_CALL_MINUTES } from "@/lib/availability";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { fill, formatPrice } from "@/lib/format";
import type { PublicProfile } from "@/lib/profile";
import type { SlotOption } from "@/components/booking/slot-picker";

/** Show at most four weeks of slots in the picker to keep the page light. */
const PICKER_DAYS = 28;

export async function buildSlotOptions(p: PublicProfile, dict: Dictionary, locale: Locale): Promise<SlotOption[]> {
  // Availability is live: always computed at request time.
  await connection();
  const timing = { id: p.id, bookingNoticeHours: p.bookingNoticeHours, bookingWindowDays: Math.min(p.bookingWindowDays, PICKER_DAYS) };
  const options: SlotOption[] = [];
  for (const o of p.offerings) {
    const slots = await getSlots(timing, o.type, o.durationMinutes);
    options.push({
      key: o.type,
      label: dict.sessionTypes[o.type].label,
      sub: `${formatPrice(o.priceCents, locale)} · ${fill(dict.price.minutes, { minutes: o.durationMinutes })}`,
      slots: slots.map((s) => s.toISOString()),
    });
  }
  if (p.introCall) {
    const remote = p.offerings.find((o) => o.type === "video") ?? p.offerings.find((o) => o.type === "phone");
    if (remote) {
      const slots = await getSlots(timing, null, INTRO_CALL_MINUTES);
      options.push({
        key: `intro:${remote.type}`,
        label: fill(dict.booking.introCallFormat, { format: dict.sessionTypes[remote.type].label.toLowerCase() }),
        sub: `${dict.booking.free} · ${fill(dict.price.minutes, { minutes: INTRO_CALL_MINUTES })}`,
        slots: slots.map((s) => s.toISOString()),
      });
    }
  }
  return options;
}
