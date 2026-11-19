import { BadgeCheck, CalendarClock, Languages, MapPin } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { cities, type TherapistSummary } from "@/data/demo-therapists";
import {
  CURRENT_YEAR,
  fill,
  formatList,
  formatPrice,
  formatShortDate,
  formatTime,
} from "@/lib/format";
import { SessionTypeIcon } from "./session-type-icon";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");
}

export function TherapistCard({
  therapist: t,
  locale,
  dict,
}: {
  therapist: TherapistSummary;
  locale: Locale;
  dict: Dictionary;
}) {
  const city = cities.find((c) => c.slug === t.citySlug);
  const hasOffice = t.offerings.some((o) => o.type === "in_person");
  const next = new Date(t.nextAvailable);

  return (
    <article className="flex h-full flex-col rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-start gap-4">
        <div
          aria-hidden="true"
          className="grid size-14 shrink-0 place-items-center rounded-full bg-primary-soft font-display text-lg font-semibold text-primary"
        >
          {initials(t.name[locale])}
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-lg font-semibold leading-snug text-ink">
            {t.name[locale]}
          </h3>
          <p className="text-sm text-muted">{t.title[locale]}</p>
          {t.verified && (
            <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary">
              <BadgeCheck className="size-4" aria-hidden="true" />
              {dict.results.verified}
            </p>
          )}
        </div>
      </div>

      <p className="mt-4 text-[15px] leading-relaxed text-ink">
        {t.headline[locale]}
      </p>

      <ul className="mb-5 mt-4 space-y-1.5 text-sm text-muted">
        <li className="flex items-start gap-2">
          <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            {hasOffice && city ? city.name[locale] : dict.results.online}
            {" · "}
            {fill(dict.results.yearsExperience, {
              years: CURRENT_YEAR - t.practisingSince,
            })}
          </span>
        </li>
        <li className="flex items-start gap-2">
          <Languages className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {fill(dict.results.speaks, {
            languages: formatList(
              t.languages.map((l) => dict.languages[l]),
              locale,
            ),
          })}
        </li>
        <li className="flex items-start gap-2">
          <CalendarClock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {fill(dict.results.nextAvailable, {
            date: `${formatShortDate(next, locale)}, ${formatTime(next, locale)}`,
          })}
        </li>
      </ul>

      <ul className="mt-auto divide-y divide-border border-t border-border">
        {t.offerings.map((o) => (
          <li
            key={o.type}
            className="flex items-center justify-between gap-3 py-2.5 text-sm"
          >
            <span className="flex items-center gap-2 text-ink">
              <SessionTypeIcon type={o.type} className="size-4 text-primary" />
              {dict.sessionTypes[o.type].label}
              <span className="text-muted">
                · {fill(dict.price.minutes, { minutes: o.durationMinutes })}
              </span>
            </span>
            <span className="font-semibold tabular-nums text-ink">
              {formatPrice(o.priceCents, locale)}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-right text-xs text-muted">{dict.price.perSession}</p>
    </article>
  );
}
