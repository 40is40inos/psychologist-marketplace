import Link from "next/link";
import { BadgeCheck, CalendarClock, Languages, MapPin, Sparkles } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { PsychologistCard as Card } from "@/lib/search";
import { CURRENT_YEAR, fill, formatList, formatPrice, formatShortDate, formatTime } from "@/lib/format";
import { Avatar } from "./avatar";
import { SessionTypeIcon } from "./session-type-icon";

export function PsychologistCard({
  card: c,
  locale,
  dict,
  footer,
  labels,
}: {
  card: Card;
  locale: Locale;
  dict: Dictionary;
  /** Extra content under the card, e.g. match reasons. */
  footer?: React.ReactNode;
  /** Taxonomy labels (slug/code -> label) from the database. */
  labels?: Record<string, string>;
}) {
  const href = `/${locale}/psychologists/${c.slug}`;
  const hasOffice = c.offerings.some((o) => o.type === "in_person");
  const languageNames = c.languages.map((l) => labels?.[l] ?? dict.languages[l as keyof Dictionary["languages"]] ?? l);

  return (
    <article className="relative flex h-full flex-col rounded-3xl border border-border bg-surface p-5 transition-shadow focus-within:ring-2 focus-within:ring-primary/30 hover:shadow-[0_8px_30px_-12px_rgb(31_42_38/0.18)] sm:p-6">
      <div className="flex items-start gap-4">
        <Avatar name={c.name} photoUrl={c.photoUrl} />
        <div className="min-w-0">
          <h3 className="font-display text-lg font-semibold leading-snug text-ink">
            {/* Whole card is clickable via the stretched link. */}
            <Link href={href} className="after:absolute after:inset-0 after:rounded-3xl focus:outline-none">
              {c.name}
            </Link>
          </h3>
          <p className="text-sm text-muted">{c.title}</p>
          <p className="mt-1.5 inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 font-medium text-primary">
              <BadgeCheck className="size-3.5" aria-hidden="true" />
              {dict.results.verified}
            </span>
            <span className="text-muted">{fill(dict.trust.licenseShort, { number: c.licenseNumber })}</span>
          </p>
        </div>
      </div>

      <p className="mt-4 text-[15px] leading-relaxed text-ink">{c.headline}</p>

      <ul className="mb-5 mt-4 space-y-1.5 text-sm text-muted">
        <li className="flex items-start gap-2">
          <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            {hasOffice && c.city ? c.city.name : dict.results.online}
            {c.practisingSince && <> · {fill(dict.results.yearsExperience, { years: CURRENT_YEAR - c.practisingSince })}</>}
          </span>
        </li>
        <li className="flex items-start gap-2">
          <Languages className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {fill(dict.results.speaks, { languages: formatList(languageNames, locale) })}
        </li>
        <li className="flex items-start gap-2">
          <CalendarClock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {c.nextAvailable
            ? fill(dict.results.nextFree, { date: `${formatShortDate(c.nextAvailable, locale)}, ${formatTime(c.nextAvailable, locale)}` })
            : dict.results.noneSoon}
        </li>
        {c.introCall && (
          <li className="flex items-start gap-2 font-medium text-primary">
            <Sparkles className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {dict.results.introCall}
          </li>
        )}
      </ul>

      <ul className="mt-auto divide-y divide-border border-t border-border">
        {c.offerings.map((o) => (
          <li key={o.type} className="flex items-center justify-between gap-3 py-2.5 text-sm">
            <span className="flex items-center gap-2 text-ink">
              <SessionTypeIcon type={o.type} className="size-4 text-primary" />
              {dict.sessionTypes[o.type].label}
              <span className="text-muted">· {fill(dict.price.minutes, { minutes: o.durationMinutes })}</span>
            </span>
            <span className="font-semibold tabular-nums text-ink">{formatPrice(o.priceCents, locale)}</span>
          </li>
        ))}
      </ul>
      <p className="text-right text-xs text-muted">{dict.price.perSession} · {dict.trust.noFeesShort}</p>
      {footer && <div className="relative mt-4 border-t border-border pt-4">{footer}</div>}
    </article>
  );
}
