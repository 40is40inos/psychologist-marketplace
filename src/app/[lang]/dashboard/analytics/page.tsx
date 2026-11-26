import { privatePageMetadata } from "@/lib/page-metadata";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock } from "lucide-react";
import { intlLocale, isLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/get-dictionary";
import { statsFor } from "@/lib/analytics";
import { fill } from "@/lib/format";
import { hasFeature, listPlans } from "@/lib/plans";
import { requirePsychologist } from "@/lib/workspace";
import { buttonClass } from "@/components/ui/form";
import { PageSkeleton } from "@/components/ui/page-skeleton";

export const generateMetadata = privatePageMetadata((d) => d.analyticsPage.title);

export default async function AnalyticsPage({ params }: PageProps<"/[lang]/dashboard/analytics">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Analytics locale={lang} dict={dict} />
    </Suspense>
  );
}

async function Analytics({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const { profileId } = await requirePsychologist(locale, `/${locale}/dashboard/analytics`);
  const t = dict.analyticsPage;

  if (!(await hasFeature(profileId, "analytics"))) {
    const plan = (await listPlans(locale)).find((p) => p.features.includes("analytics"));
    return (
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-semibold text-ink">{t.title}</h1>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-border bg-surface p-6">
          <p className="flex items-center gap-2 text-ink"><Lock className="size-4 text-muted" aria-hidden="true" />{fill(dict.workspace.featureLocked, { plan: plan?.name ?? "Pro" })}</p>
          <Link href={`/${locale}/dashboard/plan`} className={buttonClass.secondary}>{dict.workspace.upgrade}</Link>
        </div>
      </div>
    );
  }

  const s = await statsFor(profileId, 30);
  const max = Math.max(1, ...s.days.map((d) => d.views));
  const pct = new Intl.NumberFormat(intlLocale[locale], { style: "percent", maximumFractionDigits: 1 });
  const dayLabel = new Intl.DateTimeFormat(intlLocale[locale], { day: "numeric", month: "short", timeZone: "UTC" });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">{t.title}</h1>
        <p className="mt-1 text-sm text-muted">{t.period}</p>
      </div>

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          [t.appearances, s.totals.searchAppearances],
          [t.views, s.totals.views],
          [t.starts, s.totals.bookingStarts],
          [t.bookings, s.totals.bookings],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-border bg-surface p-4">
            <dt className="text-sm text-muted">{label}</dt>
            <dd className="mt-1 font-display text-2xl font-semibold tabular-nums text-ink">{Number(value).toLocaleString(intlLocale[locale])}</dd>
          </div>
        ))}
        <div className="col-span-2 rounded-2xl border border-primary/30 bg-primary-soft p-4 lg:col-span-1">
          <dt className="text-sm text-muted">{t.conversion}</dt>
          <dd className="mt-1 font-display text-2xl font-semibold tabular-nums text-ink">{pct.format(s.conversion)}</dd>
          <dd className="text-xs text-muted">{t.conversionHint}</dd>
        </div>
      </dl>

      <section aria-labelledby="chart" className="rounded-2xl border border-border bg-surface p-5">
        <h2 id="chart" className="text-sm font-semibold text-ink">{t.chartLabel}</h2>
        {/* Simple bar chart; each bar has a text label for screen readers. */}
        <ol className="mt-4 flex h-40 items-end gap-[3px]" aria-label={t.chartLabel}>
          {s.days.map((d) => (
            <li key={d.date} className="group relative flex h-full flex-1 items-end">
              <span className="sr-only">{dayLabel.format(new Date(d.date))}: {d.views}</span>
              <span
                aria-hidden="true"
                className="w-full rounded-t bg-primary/70 transition-colors group-hover:bg-primary"
                style={{ height: `${Math.max(2, (d.views / max) * 100)}%` }}
                title={`${dayLabel.format(new Date(d.date))}: ${d.views}`}
              />
            </li>
          ))}
        </ol>
        <div className="mt-2 flex justify-between text-xs text-muted" aria-hidden="true">
          <span>{dayLabel.format(new Date(s.days[0].date))}</span>
          <span>{dayLabel.format(new Date(s.days[s.days.length - 1].date))}</span>
        </div>
      </section>
      <p className="text-sm text-muted">{t.tips}</p>
    </div>
  );
}
