import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CalendarClock, Check } from "lucide-react";
import { isSessionType } from "@/domain/session-types";
import { isLocale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/get-dictionary";
import { getCurrentUser } from "@/lib/auth/session";
import { INTRO_CALL_MINUTES } from "@/lib/availability";
import { fill, formatPrice, formatShortDate, formatTime } from "@/lib/format";
import { getPublicProfile } from "@/lib/profile";
import { track } from "@/lib/analytics";
import { Avatar } from "@/components/avatar";
import { SessionTypeIcon } from "@/components/session-type-icon";
import { BookingForm } from "@/components/booking/booking-form";
import { buttonClass } from "@/components/ui/form";
import { PageSkeleton } from "@/components/ui/page-skeleton";

export const metadata: Metadata = { robots: { index: false } };

export default function BookPage(props: PageProps<"/[lang]/psychologists/[slug]/book">) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <Suspense fallback={<PageSkeleton />}>
        <Book {...props} />
      </Suspense>
    </div>
  );
}

async function Book({ params, searchParams }: PageProps<"/[lang]/psychologists/[slug]/book">) {
  await connection();
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();
  const [dict, p, sp] = await Promise.all([getDictionary(lang), getPublicProfile(slug, lang), searchParams]);
  if (!p) notFound();

  const profilePath = `/${lang}/psychologists/${slug}`;
  const type = String(sp.type ?? "");
  const kind = sp.kind === "intro_call" ? "intro_call" : "session";
  const start = new Date(String(sp.start ?? ""));
  const offering = p.offerings.find((o) => o.type === type);
  if (!isSessionType(type) || !offering || Number.isNaN(+start) || start < new Date()) redirect(profilePath);

  const t = dict.booking;
  const duration = kind === "intro_call" ? INTRO_CALL_MINUTES : offering.durationMinutes;
  const price = kind === "intro_call" ? 0 : offering.priceCents;
  const priceLabel = price === 0 ? t.free : formatPrice(price, lang);
  const formatLabel = kind === "intro_call" ? fill(t.introCallFormat, { format: dict.sessionTypes[type].label.toLowerCase() }) : dict.sessionTypes[type].label;
  const user = await getCurrentUser();
  track([p.id], "bookingStarts");
  const here = `${profilePath}/book?${new URLSearchParams({ type, kind, start: start.toISOString() })}`;

  return (
    <>
      <Steps dict={dict} current={2} />
      <h1 className="mt-6 font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{fill(t.title, { name: p.name })}</h1>

      <section aria-label={t.summary} className="mt-6 rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-center gap-4">
          <Avatar name={p.name} photoUrl={p.photoUrl} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-ink">{p.name}</p>
            <p className="text-sm text-muted">{dict.titles[p.title as keyof Dictionary["titles"]]}</p>
          </div>
          <Link href={profilePath} className="text-sm font-medium text-primary hover:underline">{t.change}</Link>
        </div>
        <dl className="mt-4 grid gap-3 border-t border-border pt-4 text-sm sm:grid-cols-3">
          <div className="flex items-center gap-2">
            <CalendarClock className="size-4 text-primary" aria-hidden="true" />
            <dd className="font-medium text-ink">
              {formatShortDate(start, lang)}, {formatTime(start, lang)}
            </dd>
          </div>
          <div className="flex items-center gap-2">
            <SessionTypeIcon type={type} className="size-4 text-primary" />
            <dd className="text-ink">{formatLabel} · {fill(dict.price.minutes, { minutes: duration })}</dd>
          </div>
          <div className="sm:text-right">
            <dd className="font-semibold tabular-nums text-ink">{priceLabel}</dd>
          </div>
        </dl>
        {type === "in_person" && p.office && (
          <p className="mt-3 text-sm text-muted">{p.office.address}, {p.office.city}</p>
        )}
      </section>

      <div className="mt-8">
        {!user ? (
          <div className="rounded-2xl border border-border bg-surface-muted p-5">
            <p className="text-ink">{t.signInToBook}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={`/${lang}/sign-in?next=${encodeURIComponent(here)}`} className={buttonClass.primary}>{t.signIn}</Link>
              <Link href={`/${lang}/sign-up?next=${encodeURIComponent(here)}`} className={buttonClass.secondary}>{dict.nav.signUp}</Link>
            </div>
          </div>
        ) : user.role !== "client" ? (
          <p className="rounded-2xl bg-surface-muted p-5 text-muted">{t.errors.not_allowed}</p>
        ) : (
          <BookingForm
            t={t}
            priceLabel={priceLabel}
            backHref={profilePath}
            hidden={{ slug, type, kind, start: start.toISOString(), locale: lang }}
          />
        )}
      </div>
    </>
  );
}

function Steps({ dict, current }: { dict: Dictionary; current: number }) {
  const steps = [dict.booking.steps.type, dict.booking.steps.slot, dict.booking.steps.details, dict.booking.steps.confirm];
  return (
    <ol className="flex items-center gap-2 text-xs sm:text-sm">
      {steps.map((s, i) => (
        <li key={s} className="flex items-center gap-2" aria-current={i === current ? "step" : undefined}>
          <span className={`grid size-6 place-items-center rounded-full text-xs font-semibold ${i < current ? "bg-primary text-primary-ink" : i === current ? "border-2 border-primary text-primary" : "border border-border text-muted"}`}>
            {i < current ? <Check className="size-3.5" aria-hidden="true" /> : i + 1}
          </span>
          <span className={i === current ? "font-semibold text-ink" : "text-muted"}>{s}</span>
          {i < steps.length - 1 && <span aria-hidden="true" className="h-px w-3 bg-border sm:w-6" />}
        </li>
      ))}
    </ol>
  );
}
