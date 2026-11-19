import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Accessibility, BadgeCheck, CalendarCheck, GraduationCap, Languages, MapPin, MessageCircle, ShieldCheck, Sparkles, Star, ReceiptEuro } from "lucide-react";
import { policy } from "@/config/policy";
import { getIndicators } from "@/lib/indicators";
import { currentMarket } from "@/config/market";
import { intlLocale, isLocale, locales, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/get-dictionary";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { CURRENT_YEAR, fill, formatList, formatPrice, formatShortDate } from "@/lib/format";
import { getPublicProfile, videoEmbed, type PublicProfile } from "@/lib/profile";
import { buildSlotOptions } from "@/lib/slot-options";
import { getTaxonomy } from "@/lib/taxonomy-data";
import { track } from "@/lib/analytics";
import { Avatar } from "@/components/avatar";
import { SaveButton } from "@/components/save-button";
import { SessionTypeIcon } from "@/components/session-type-icon";
import { SlotPicker } from "@/components/booking/slot-picker";
import { VideoEmbed } from "@/components/profile/video-embed";
import { LazyMap } from "@/components/map/lazy-map";

export async function generateMetadata({ params }: PageProps<"/[lang]/psychologists/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLocale(lang)) return {};
  const p = await getPublicProfile(slug, lang);
  if (!p) return { robots: { index: false } };
  return {
    title: p.name,
    description: p.headline,
    alternates: {
      canonical: `/${lang}/psychologists/${slug}`,
      languages: Object.fromEntries(locales.map((l) => [l, `/${l}/psychologists/${slug}`])),
    },
  };
}

export default function ProfilePage({ params }: PageProps<"/[lang]/psychologists/[slug]">) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <Suspense fallback={<ProfileSkeleton />}>
        <Profile params={params} />
      </Suspense>
    </div>
  );
}

async function Profile({ params }: { params: PageProps<"/[lang]/psychologists/[slug]">["params"] }) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();
  const [dict, p, taxonomy] = await Promise.all([getDictionary(lang), getPublicProfile(slug, lang), getTaxonomy(lang)]);
  if (!p) notFound();

  const t = dict.profile;
  const user = await getCurrentUser();
  const saved =
    user?.role === "client" &&
    !!(await db.savedPsychologist.findUnique({ where: { userId_psychologistId: { userId: user.id, psychologistId: p.id } } }));
  const [options, indicators] = await Promise.all([buildSlotOptions(p, dict, lang), getIndicators(p.id)]);
  // Count views from everyone except the psychologist themselves.
  if (user?.role !== "psychologist") track([p.id], "views");
  const embed = videoEmbed(p.videoUrl);
  const path = `/${lang}/psychologists/${p.slug}`;
  const languageNames = p.languages.map((l) => taxonomy.labels[l] ?? l);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="min-w-0 space-y-10">
        {/* Header */}
        <header className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <Avatar name={p.name} photoUrl={p.photoUrl} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">{p.name}</h1>
            <p className="mt-1 text-muted">
              {dict.titles[p.title as keyof Dictionary["titles"]]}
              {p.practisingSince && <> · {fill(dict.results.yearsExperience, { years: CURRENT_YEAR - p.practisingSince })}</>}
            </p>
            <p className="mt-3 text-lg leading-relaxed text-ink" lang={p.textLocale}>{p.headline}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1.5 text-sm font-medium text-primary">
                <BadgeCheck className="size-4" aria-hidden="true" />
                {t.verified}
              </span>
              {(!user || user.role === "client") && (
                <SaveButton slug={p.slug} saved={saved} locale={lang} returnTo={path} labels={{ save: t.save, saved: t.saved }} />
              )}
            </div>
            <p className="mt-2 text-sm text-muted">{fill(t.license, { number: p.licenseNumber, authority: p.licensingAuthority })}</p>
            <p className="mt-0.5 text-sm text-muted">{dict.trust.licenseChecked}</p>
          </div>
        </header>

        {embed && (
          <section aria-labelledby="video">
            <h2 id="video" className="sr-only">{t.video}</h2>
            <VideoEmbed src={embed.src} title={`${t.video}: ${p.name}`} play={t.playVideo} consent={fill(t.videoConsent, { host: embed.host })} />
          </section>
        )}

        <Block id="about" title={t.about}>
          <p className="whitespace-pre-line leading-relaxed text-ink" lang={p.textLocale}>{p.bio}</p>
          {p.approachText && (
            <>
              <h3 className="mt-6 font-semibold text-ink">{t.approach}</h3>
              <p className="mt-2 whitespace-pre-line leading-relaxed text-ink" lang={p.textLocale}>{p.approachText}</p>
            </>
          )}
        </Block>

        <div className="grid gap-8 sm:grid-cols-2">
          <Block id="concerns" title={t.concerns}>
            <Tags items={p.concerns.map((c) => taxonomy.labels[c] ?? c)} />
          </Block>
          <Block id="approaches" title={t.approaches}>
            <Tags items={p.approaches.map((a) => taxonomy.labels[a] ?? a)} />
          </Block>
          <Block id="client-types" title={t.clientTypes}>
            <Tags items={p.clientTypes.map((c) => taxonomy.labels[c] ?? c)} />
          </Block>
          <Block id="languages" title={t.languages}>
            <p className="flex items-center gap-2 text-ink">
              <Languages className="size-4 text-primary" aria-hidden="true" />
              {formatList(languageNames, lang)}
            </p>
          </Block>
        </div>

        {p.education.length > 0 && (
          <Block id="education" title={t.education}>
            <ul className="space-y-3">
              {p.education.map((e) => (
                <li key={`${e.degree}-${e.institution}`} className="flex gap-3">
                  <GraduationCap className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                  <span>
                    <span className="block font-medium text-ink">{e.degree}</span>
                    <span className="block text-sm text-muted">{e.institution}{e.year && ` · ${e.year}`}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Block>
        )}

        <Block id="prices" title={t.prices}>
          <p className="-mt-2 mb-4 flex items-start gap-2 text-sm text-muted">
            <ReceiptEuro className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            {dict.trust.noHiddenFees}
          </p>
          <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
            {p.offerings.map((o) => (
              <li key={o.type} className="flex items-center justify-between gap-3 p-4">
                <span className="flex items-center gap-3">
                  <SessionTypeIcon type={o.type} className="size-5 text-primary" />
                  <span>
                    <span className="block font-medium text-ink">{dict.sessionTypes[o.type].label}</span>
                    <span className="block text-sm text-muted">{fill(dict.price.minutes, { minutes: o.durationMinutes })}</span>
                  </span>
                </span>
                <span className="text-right">
                  <span className="block font-semibold tabular-nums text-ink">{formatPrice(o.priceCents, lang)}</span>
                  <span className="block text-xs text-muted">{dict.price.perSession}</span>
                </span>
              </li>
            ))}
            {p.introCall && (
              <li className="flex items-start gap-3 p-4">
                <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                <span>
                  <span className="block font-medium text-ink">{t.introCall}</span>
                  <span className="block text-sm text-muted">{t.introCallBody}</span>
                </span>
              </li>
            )}
          </ul>
        </Block>

        {p.office && (
          <Block id="office" title={t.office}>
            <p className="flex items-start gap-2 text-ink">
              <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              {p.office.address}, {p.office.postalCode} {p.office.city}
            </p>
            {p.office.wheelchair && (
              <p className="mt-2 flex items-center gap-2 text-sm text-muted">
                <Accessibility className="size-4" aria-hidden="true" />
                {t.wheelchair}
              </p>
            )}
            {p.office.lat != null && p.office.lng != null && (
              <div className="mt-4">
                <LazyMap className="h-64" labels={dict.cookies} points={[{ slug: p.slug, name: p.name, lat: p.office.lat, lng: p.office.lng, label: p.office.address, href: path }]} />
              </div>
            )}
          </Block>
        )}

        {(indicators.replyHours !== null || indicators.heldRate !== null) && (
          <Block id="indicators" title={dict.indicators.title}>
            <ul className="space-y-2 text-ink">
              {indicators.replyHours !== null && (
                <li className="flex gap-2"><MessageCircle className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                  {indicators.replyHours <= 12 ? fill(dict.indicators.replies, { hours: Math.max(1, Math.ceil(indicators.replyHours)) }) : dict.indicators.repliesDay}
                </li>
              )}
              {indicators.heldRate !== null && (
                <li className="flex gap-2"><CalendarCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                  {fill(dict.indicators.held, { percent: new Intl.NumberFormat(intlLocale[lang], { style: "percent", maximumFractionDigits: 0 }).format(indicators.heldRate) })}
                </li>
              )}
            </ul>
            <p className="mt-2 text-xs text-muted">{dict.indicators.basis}</p>
          </Block>
        )}

        <Block id="cancellation" title={t.cancellation}>
          <p className="flex gap-2 text-ink">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
            {fill(t.cancellationText, { hours: p.cancellationHours, percent: p.lateFeePercent })}
          </p>
        </Block>

        {policy.publicTestimonials && p.reviews.length > 0 && (
          <Block id="reviews" title={dict.reviewsPublic.title}>
            <p className="mb-3 flex items-center gap-2 text-sm text-muted">
              <Star className="size-4 fill-current text-primary" aria-hidden="true" />
              {fill(dict.reviewsPublic.average, { rating: (p.ratingAverage ?? 0).toLocaleString(lang, { maximumFractionDigits: 1 }) })} · {fill(dict.reviewsPublic.count, { count: p.reviews.length })}
            </p>
            <ul className="space-y-3">
              {p.reviews.map((r, i) => (
                <li key={i} className="rounded-2xl border border-border bg-surface p-4">
                  <p className="flex items-center gap-0.5" aria-label={`${r.rating}/5`}>
                    {Array.from({ length: 5 }, (_, k) => <Star key={k} className={`size-4 ${k < r.rating ? "fill-current text-primary" : "text-border"}`} aria-hidden="true" />)}
                  </p>
                  {r.comment && <p className="mt-2 whitespace-pre-line text-ink">{r.comment}</p>}
                  <p className="mt-2 text-xs text-muted">{dict.reviewsPublic.anonymous} · {formatShortDate(r.date, lang)}</p>
                </li>
              ))}
            </ul>
          </Block>
        )}

        {p.faqs.length > 0 && (
          <Block id="faq" title={t.faq}>
            <div className="divide-y divide-border rounded-2xl border border-border bg-surface">
              {p.faqs.map((f) => (
                <details key={f.question} className="group p-4">
                  <summary className="cursor-pointer list-none font-medium text-ink marker:hidden">
                    <span className="flex items-center justify-between gap-3">
                      {f.question}
                      <span aria-hidden="true" className="text-muted transition-transform group-open:rotate-45">+</span>
                    </span>
                  </summary>
                  <p className="mt-2 whitespace-pre-line text-muted">{f.answer}</p>
                </details>
              ))}
            </div>
          </Block>
        )}
      </div>

      {/* Booking widget: sticky on desktop, inline on phones. */}
      <aside aria-labelledby="book" className="lg:sticky lg:top-20 lg:self-start">
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <h2 id="book" className="text-lg font-semibold text-ink">{t.availability}</h2>
          <div className="mt-4">
            <BookingWidget p={p} dict={dict} locale={lang} options={options} />
          </div>
        </div>
      </aside>
    </div>
  );
}

function BookingWidget({ p, dict, locale, options }: { p: PublicProfile; dict: Dictionary; locale: Locale; options: Awaited<ReturnType<typeof buildSlotOptions>> }) {
  if (!options.some((o) => o.slots.length)) return <p className="text-sm text-muted">{dict.profile.noAvailability}</p>;
  return (
    <SlotPicker
      options={options}
      intlLocale={intlLocale[locale]}
      timeZone={currentMarket.timeZone}
      mode={{ kind: "link", base: `/${locale}/psychologists/${p.slug}/book` }}
      labels={{
        chooseType: dict.booking.chooseType,
        chooseSlot: dict.booking.chooseSlot,
        noSlots: dict.booking.noSlots,
        more: dict.booking.moreDays,
        earlier: dict.booking.earlierDays,
        tz: dict.booking.timesShownIn,
      }}
    />
  );
}

function Block({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="scroll-mt-24">
      <h2 id={id} className="mb-3 text-xl font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}

function Tags({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((i) => (
        <li key={i} className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-ink">{i}</li>
      ))}
    </ul>
  );
}

function ProfileSkeleton() {
  return (
    <div aria-busy="true" className="grid gap-10 lg:grid-cols-[1fr_24rem]">
      <div className="space-y-6">
        <div className="flex gap-5">
          <div className="size-24 animate-pulse rounded-full bg-surface-muted" />
          <div className="flex-1 space-y-3">
            <div className="h-9 w-2/3 animate-pulse rounded bg-surface-muted" />
            <div className="h-5 w-1/2 animate-pulse rounded bg-surface-muted" />
          </div>
        </div>
        <div className="h-48 animate-pulse rounded-2xl bg-surface-muted" />
      </div>
      <div className="h-96 animate-pulse rounded-2xl bg-surface-muted" />
    </div>
  );
}
