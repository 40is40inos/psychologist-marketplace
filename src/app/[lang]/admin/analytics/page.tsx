import { privatePageMetadata } from "@/lib/page-metadata";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { intlLocale, isLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/get-dictionary";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import { daysAgo, localDateKey } from "@/lib/time";
import { getTaxonomy } from "@/lib/taxonomy-data";
import { PageSkeleton } from "@/components/ui/page-skeleton";

const DAYS = 30;

export const generateMetadata = privatePageMetadata((d) => d.adminX.analytics.title);

export default async function AdminAnalyticsPage({ params }: PageProps<"/[lang]/admin/analytics">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Analytics locale={lang} dict={dict} />
    </Suspense>
  );
}

/** Count rows per local day for the last 30 days. */
function perDay(dates: Date[]): { date: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const d of dates) counts.set(localDateKey(d), (counts.get(localDateKey(d)) ?? 0) + 1);
  return Array.from({ length: DAYS }, (_, i) => {
    const key = localDateKey(daysAgo(DAYS - 1 - i));
    return { date: key, count: counts.get(key) ?? 0 };
  });
}

async function Analytics({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  await requireRole(locale, "admin", `/${locale}/admin/analytics`);
  const t = dict.adminX.analytics;
  const since = daysAgo(DAYS);

  const [users, bookings, money, top, zero, taxonomy] = await Promise.all([
    db.user.findMany({ where: { createdAt: { gte: since }, role: { in: ["client", "psychologist"] } }, select: { createdAt: true, role: true } }),
    db.appointment.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    db.payment.aggregate({ where: { paidAt: { gte: since }, status: { in: ["paid", "refunded"] } }, _sum: { amountCents: true, commissionCents: true, refundedCents: true } }),
    db.searchLog.groupBy({ by: ["query"], where: { createdAt: { gte: since }, query: { not: "" } }, _count: { _all: true }, orderBy: { _count: { query: "desc" } }, take: 15 }),
    db.searchLog.findMany({ where: { createdAt: { gte: since }, resultCount: 0 }, select: { query: true, filters: true }, take: 500, orderBy: { createdAt: "desc" } }),
    getTaxonomy(locale),
  ]);

  // Zero-result searches grouped by query, or by filter combination when there was no text.
  const zeroGroups = new Map<string, number>();
  for (const z of zero) {
    const f = (z.filters ?? {}) as Record<string, unknown>;
    const label =
      z.query ||
      `${t.filtersOnly} ${Object.entries(f)
        .map(([k, v]) => `${k}: ${(Array.isArray(v) ? v : [v]).map((x) => taxonomy.labels[String(x)] ?? String(x)).join(", ")}`)
        .join(" · ")}`;
    zeroGroups.set(label, (zeroGroups.get(label) ?? 0) + 1);
  }
  const zeroList = [...zeroGroups.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);

  const clients = users.filter((u) => u.role === "client").length;
  const psychologists = users.length - clients;
  const n = (x: number) => x.toLocaleString(intlLocale[locale]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">{t.title}</h1>
        <p className="mt-1 text-sm text-muted">{t.period}</p>
      </div>

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label={t.signups} value={n(users.length)} sub={`${t.signupsClients} ${n(clients)} · ${t.signupsPsychologists} ${n(psychologists)}`} />
        <Stat label={t.bookings} value={n(bookings.length)} />
        <Stat label={t.revenue} value={formatPrice(money._sum.amountCents ?? 0, locale)} />
        <Stat label={t.fees} value={formatPrice(money._sum.commissionCents ?? 0, locale)} />
        <Stat label={t.refunds} value={formatPrice(money._sum.refundedCents ?? 0, locale)} />
      </dl>

      <div className="grid gap-4 lg:grid-cols-2">
        <Chart title={`${t.signups} · ${t.perDay}`} data={perDay(users.map((u) => u.createdAt))} locale={locale} />
        <Chart title={`${t.bookings} · ${t.perDay}`} data={perDay(bookings.map((b) => b.createdAt))} locale={locale} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Table title={t.topSearches} rows={top.map((r) => [r.query, r._count._all])} t={t} />
        <Table title={t.noResults} hint={t.noResultsHint} rows={zeroList} t={t} />
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 font-display text-2xl font-semibold tabular-nums text-ink">{value}</dd>
      {sub && <dd className="text-xs text-muted">{sub}</dd>}
    </div>
  );
}

function Chart({ title, data, locale }: { title: string; data: { date: string; count: number }[]; locale: Locale }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const fmt = new Intl.DateTimeFormat(intlLocale[locale], { day: "numeric", month: "short", timeZone: "UTC" });
  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      <ol className="mt-4 flex h-32 items-end gap-[3px]" aria-label={title}>
        {data.map((d) => (
          <li key={d.date} className="flex h-full flex-1 items-end">
            <span className="sr-only">{fmt.format(new Date(d.date))}: {d.count}</span>
            <span aria-hidden="true" title={`${fmt.format(new Date(d.date))}: ${d.count}`} className="w-full rounded-t bg-primary/70" style={{ height: `${Math.max(2, (d.count / max) * 100)}%` }} />
          </li>
        ))}
      </ol>
      <div className="mt-2 flex justify-between text-xs text-muted" aria-hidden="true">
        <span>{fmt.format(new Date(data[0].date))}</span>
        <span>{fmt.format(new Date(data[data.length - 1].date))}</span>
      </div>
    </section>
  );
}

function Table({ title, hint, rows, t }: { title: string; hint?: string; rows: [string, number][]; t: Dictionary["adminX"]["analytics"] }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted">{t.none}</p>
      ) : (
        <table className="mt-3 w-full text-sm">
          <thead className="text-left text-xs text-muted">
            <tr><th className="pb-2 font-medium">{t.query}</th><th className="pb-2 text-right font-medium">{t.count}</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map(([q, c]) => (
              <tr key={q}><td className="py-2 pr-3 text-ink">{q}</td><td className="py-2 text-right tabular-nums text-ink">{c}</td></tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
