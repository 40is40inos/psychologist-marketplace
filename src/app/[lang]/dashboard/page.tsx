import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight, BadgeCheck, Bell, CalendarClock, Clock, ShieldAlert } from "lucide-react";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/get-dictionary";
import { db } from "@/lib/db";
import { fill, formatPrice, formatShortDate } from "@/lib/format";
import { onboardingChecklist } from "@/lib/onboarding";
import { statsFor } from "@/lib/analytics";
import { requirePsychologist } from "@/lib/workspace";
import { daysAgo } from "@/lib/time";
import { AppointmentRow } from "@/components/appointment-row";
import { buttonClass } from "@/components/ui/form";
import { EmptyState, PageSkeleton } from "@/components/ui/page-skeleton";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: dict.nav.dashboard, robots: { index: false } };
}

export default async function DashboardPage({ params }: PageProps<"/[lang]/dashboard">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Overview locale={lang} dict={dict} />
    </Suspense>
  );
}

async function Overview({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const { user, profileId } = await requirePsychologist(locale, `/${locale}/dashboard`);
  const t = dict.dashboard;
  const now = new Date();

  const [profile, checklist, requests, upcoming, stats, earnings] = await Promise.all([
    db.psychologistProfile.findUniqueOrThrow({
      where: { id: profileId },
      select: { title: true, verificationStatus: true, rejectionReason: true, submittedAt: true },
    }),
    onboardingChecklist(profileId),
    db.appointment.count({ where: { psychologistId: profileId, status: "pending", startsAt: { gte: now } } }),
    db.appointment.findMany({
      where: { psychologistId: profileId, status: "confirmed", startsAt: { gte: now } },
      orderBy: { startsAt: "asc" },
      take: 5,
      include: { client: { select: { name: true } } },
    }),
    statsFor(profileId, 30),
    db.payment.aggregate({
      where: { status: "paid", paidAt: { gte: daysAgo(30) }, appointment: { psychologistId: profileId } },
      _sum: { amountCents: true, commissionCents: true },
    }),
  ]);

  const status = profile.verificationStatus;
  const banner = t.verification[status];
  const BannerIcon = status === "verified" ? BadgeCheck : status === "pending" ? Clock : ShieldAlert;
  const incomplete = Object.values(checklist).filter((v) => !v).length;
  const base = `/${locale}/dashboard`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">{fill(t.title, { name: user.name.split(" ")[0] })}</h1>
        <p className="mt-1 text-muted">{dict.titles[profile.title]}</p>
      </div>

      <div role="status" className={`flex gap-3 rounded-2xl border p-4 sm:p-5 ${status === "verified" ? "border-primary/30 bg-primary-soft" : status === "pending" ? "border-border bg-surface-muted" : "border-accent/30 bg-accent-soft"}`}>
        <BannerIcon className={`mt-0.5 size-5 shrink-0 ${status === "verified" ? "text-primary" : status === "pending" ? "text-muted" : "text-accent"}`} aria-hidden="true" />
        <div className="flex-1">
          <p className="font-semibold text-ink">{banner.title}</p>
          <p className="text-sm text-ink/80">
            {status === "pending" && profile.submittedAt
              ? fill(dict.onboarding.submitted, { date: formatShortDate(profile.submittedAt, locale) })
              : fill(banner.body, { reason: profile.rejectionReason ?? "—" })}
          </p>
          {(status !== "verified" && (!profile.submittedAt || incomplete > 0)) && (
            <Link href={`${base}/profile`} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
              {dict.onboarding.title} ({Object.keys(checklist).length - incomplete}/{Object.keys(checklist).length})
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={dict.apptPage.tabs.requests} value={String(requests)} href={`${base}/appointments`} highlight={requests > 0} icon={<Bell className="size-4" aria-hidden="true" />} />
        <Stat label={dict.analyticsPage.views} value={String(stats.totals.views)} href={`${base}/analytics`} />
        <Stat label={dict.analyticsPage.bookings} value={String(stats.totals.bookings)} href={`${base}/analytics`} />
        <Stat label={dict.paymentsPage.net} value={formatPrice((earnings._sum.amountCents ?? 0) - (earnings._sum.commissionCents ?? 0), locale)} href={`${base}/payments`} />
      </dl>

      <section aria-labelledby="upcoming">
        <div className="flex items-center justify-between gap-3">
          <h2 id="upcoming" className="flex items-center gap-2 text-lg font-semibold text-ink">
            <CalendarClock className="size-5 text-primary" aria-hidden="true" />
            {t.upcomingTitle}
          </h2>
          <Link href={`${base}/appointments`} className="text-sm font-medium text-primary hover:underline">{dict.workspace.nav.appointments} →</Link>
        </div>
        {upcoming.length ? (
          <ul className="mt-2 divide-y divide-border rounded-2xl border border-border bg-surface px-4">
            {upcoming.map((a) => (
              <AppointmentRow
                key={a.id}
                locale={locale}
                dict={dict}
                href={`${base}/appointments#${a.id}`}
                a={{ id: a.id, startsAt: a.startsAt, sessionType: a.sessionType, kind: a.kind, status: a.status, priceCents: a.priceCents, counterpart: a.client.name }}
              />
            ))}
          </ul>
        ) : (
          <div className="mt-3">
            <EmptyState scene="calendar" title={t.noUpcoming}>
              <Link href={`${base}/calendar`} className={buttonClass.secondary}>{dict.workspace.nav.calendar}</Link>
            </EmptyState>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, href, highlight, icon }: { label: string; value: string; href: string; highlight?: boolean; icon?: React.ReactNode }) {
  return (
    <Link href={href} className={`rounded-2xl border p-4 transition-colors hover:border-primary ${highlight ? "border-accent/40 bg-accent-soft" : "border-border bg-surface"}`}>
      <dt className="flex items-center gap-1.5 text-sm text-muted">{icon}{label}</dt>
      <dd className="mt-1 font-display text-2xl font-semibold tabular-nums text-ink">{value}</dd>
    </Link>
  );
}
