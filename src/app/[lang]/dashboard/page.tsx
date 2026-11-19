import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BadgeCheck, CalendarClock, Clock, ShieldAlert, Users } from "lucide-react";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/get-dictionary";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { fill, formatShortDate } from "@/lib/format";
import { AppointmentRow } from "@/components/appointment-row";
import { ProfileForm } from "@/components/dashboard/profile-form";
import { PricesForm, type PricesFormData } from "@/components/dashboard/prices-form";
import { EmptyState, PageSkeleton } from "@/components/ui/page-skeleton";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: dict.nav.dashboard, robots: { index: false } };
}

/** Psychologist area: verification status, profile, prices, sessions, clients. */
export default async function DashboardPage({ params }: PageProps<"/[lang]/dashboard">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <Suspense fallback={<PageSkeleton />}>
        <Dashboard locale={lang} dict={dict} />
      </Suspense>
    </div>
  );
}

async function Dashboard({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const user = await requireRole(locale, "psychologist", `/${locale}/dashboard`);
  const t = dict.dashboard;
  const now = new Date();

  const profile = await db.psychologistProfile.findUnique({
    where: { userId: user.id },
    include: {
      translations: true,
      offerings: true,
      appointments: {
        where: { startsAt: { gte: now }, status: { in: ["pending", "confirmed"] } },
        orderBy: { startsAt: "asc" },
        take: 10,
        include: { client: { select: { name: true } } },
      },
    },
  });
  if (!profile) notFound();

  // Clients = people with at least one non-cancelled session.
  const clientStats = await db.appointment.groupBy({
    by: ["clientId"],
    where: { psychologistId: profile.id, status: { in: ["confirmed", "completed"] } },
    _count: { _all: true },
    _max: { startsAt: true },
    orderBy: { _max: { startsAt: "desc" } },
    take: 20,
  });
  const clientNames = new Map(
    (
      await db.user.findMany({
        where: { id: { in: clientStats.map((c) => c.clientId) } },
        select: { id: true, name: true },
      })
    ).map((u) => [u.id, u.name]),
  );

  const status = profile.verificationStatus;
  const banner = t.verification[status];
  const BannerIcon = status === "verified" ? BadgeCheck : status === "pending" ? Clock : ShieldAlert;
  const bannerTone =
    status === "verified"
      ? "border-primary/30 bg-primary-soft"
      : status === "pending"
        ? "border-border bg-surface-muted"
        : "border-accent/30 bg-accent-soft";

  const prices: PricesFormData = Object.fromEntries(
    profile.offerings.map((o) => [o.type, { active: o.active, durationMinutes: o.durationMinutes, priceCents: o.priceCents }]),
  );

  return (
    <>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
        {fill(t.title, { name: user.name.split(" ")[0] })}
      </h1>
      <p className="mt-1 text-muted">{dict.titles[profile.title]}</p>

      <div role="status" className={`mt-6 flex gap-3 rounded-2xl border p-4 sm:p-5 ${bannerTone}`}>
        <BannerIcon className={`mt-0.5 size-5 shrink-0 ${status === "verified" ? "text-primary" : status === "pending" ? "text-muted" : "text-accent"}`} aria-hidden="true" />
        <div>
          <p className="font-semibold text-ink">{banner.title}</p>
          <p className="text-sm text-ink/80">{fill(banner.body, { reason: profile.rejectionReason ?? "—" })}</p>
        </div>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-12">
          <section aria-labelledby="prices">
            <h2 id="prices" className="text-xl font-semibold text-ink">{t.pricesTitle}</h2>
            <p className="mb-4 mt-1 text-sm text-muted">{t.pricesSubtitle}</p>
            <PricesForm data={prices} t={t} sessionTypes={dict.sessionTypes} />
            <p className="mt-3 flex items-center gap-2 text-sm text-muted">
              <CalendarClock className="size-4" aria-hidden="true" />
              {t.availabilityNote}
            </p>
          </section>

          <section aria-labelledby="profile">
            <h2 id="profile" className="text-xl font-semibold text-ink">{t.profileTitle}</h2>
            <p className="mb-4 mt-1 text-sm text-muted">{t.profileSubtitle}</p>
            <ProfileForm
              t={t}
              languages={dict.languages}
              data={{
                practisingSince: profile.practisingSince,
                sessionLanguages: profile.sessionLanguages,
                published: profile.published,
                translations: Object.fromEntries(
                  profile.translations.map((tr) => [tr.locale, { headline: tr.headline, bio: tr.bio, approach: tr.approach }]),
                ),
              }}
            />
          </section>
        </div>

        <aside className="space-y-10">
          <section aria-labelledby="upcoming">
            <h2 id="upcoming" className="flex items-center gap-2 text-lg font-semibold text-ink">
              <CalendarClock className="size-5 text-primary" aria-hidden="true" />
              {t.upcomingTitle}
            </h2>
            {profile.appointments.length ? (
              <ul className="mt-2 divide-y divide-border rounded-2xl border border-border bg-surface px-4">
                {profile.appointments.map((a) => (
                  <AppointmentRow
                    key={a.id}
                    locale={locale}
                    dict={dict}
                    a={{ id: a.id, startsAt: a.startsAt, sessionType: a.sessionType, status: a.status, priceCents: a.priceCents, counterpart: a.client.name }}
                  />
                ))}
              </ul>
            ) : (
              <div className="mt-3"><EmptyState title={t.noUpcoming} /></div>
            )}
          </section>

          <section aria-labelledby="clients">
            <h2 id="clients" className="flex items-center gap-2 text-lg font-semibold text-ink">
              <Users className="size-5 text-primary" aria-hidden="true" />
              {t.clientsTitle}
            </h2>
            {clientStats.length ? (
              <ul className="mt-2 divide-y divide-border rounded-2xl border border-border bg-surface px-4">
                {clientStats.map((c) => (
                  <li key={c.clientId} className="py-3">
                    <p className="font-medium text-ink">{clientNames.get(c.clientId)}</p>
                    <p className="text-sm text-muted">
                      {fill(t.sessionsCount, { count: c._count._all })}
                      {c._max.startsAt && ` · ${fill(t.lastSession, { date: formatShortDate(c._max.startsAt, locale) })}`}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted">{t.noClients}</p>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
