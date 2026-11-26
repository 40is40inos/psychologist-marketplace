import { privatePageMetadata } from "@/lib/page-metadata";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { intlLocale, isLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/get-dictionary";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { fill, formatPrice, formatShortDate, formatTime, startOfMonthInMarket } from "@/lib/format";
import { PageSkeleton } from "@/components/ui/page-skeleton";

export const generateMetadata = privatePageMetadata((d) => d.admin.title);

export default async function AdminOverviewPage({ params }: PageProps<"/[lang]/admin">) {
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
  await requireRole(locale, "admin", `/${locale}/admin`);
  const t = dict.admin;
  const monthStart = startOfMonthInMarket(new Date());

  const [clients, verified, pending, sessions, value, disputes, activity] = await Promise.all([
    db.user.count({ where: { role: "client", deletedAt: null } }),
    db.psychologistProfile.count({ where: { verificationStatus: "verified" } }),
    db.psychologistProfile.count({ where: { verificationStatus: "pending" } }),
    db.appointment.count({ where: { startsAt: { gte: monthStart }, status: { in: ["confirmed", "completed"] } } }),
    db.appointment.aggregate({ _sum: { priceCents: true }, where: { startsAt: { gte: monthStart }, status: { in: ["confirmed", "completed"] } } }),
    db.dispute.count({ where: { status: { in: ["open", "under_review"] } } }),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 10, include: { actor: { select: { name: true } } } }),
  ]);

  const stats = [
    { label: t.stats.clients, value: clients.toLocaleString(intlLocale[locale]) },
    { label: t.stats.psychologists, value: verified.toLocaleString(intlLocale[locale]) },
    { label: t.stats.pendingVerifications, value: pending.toLocaleString(intlLocale[locale]), highlight: pending > 0 },
    { label: t.stats.appointmentsThisMonth, value: sessions.toLocaleString(intlLocale[locale]) },
    { label: t.stats.revenueThisMonth, value: formatPrice(value._sum.priceCents ?? 0, locale) },
    { label: t.stats.openDisputes, value: disputes.toLocaleString(intlLocale[locale]), highlight: disputes > 0 },
  ];

  return (
    <>
      <h1 className="sr-only">{t.nav.overview}</h1>
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className={`rounded-2xl border p-4 sm:p-5 ${s.highlight ? "border-accent/40 bg-accent-soft" : "border-border bg-surface"}`}>
            <dt className="text-sm text-muted">{s.label}</dt>
            <dd className="mt-1 font-display text-2xl font-semibold tabular-nums text-ink sm:text-3xl">{s.value}</dd>
          </div>
        ))}
      </dl>

      <section className="mt-10" aria-labelledby="activity">
        <h2 id="activity" className="text-lg font-semibold text-ink">{t.recentActivity}</h2>
        {activity.length ? (
          <ul className="mt-2 divide-y divide-border rounded-2xl border border-border bg-surface px-4">
            {activity.map((entry) => {
              const target = (entry.metadata as { name?: string } | null)?.name ?? "";
              const template = (t.actions as Record<string, string>)[entry.action] ?? entry.action;
              return (
                <li key={entry.id} className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-3 text-sm">
                  <span className="text-ink">
                    <span className="font-medium">{entry.actor.name}</span> {fill(template, { target })}
                  </span>
                  <span className="tabular-nums text-muted">
                    {formatShortDate(entry.createdAt, locale)}, {formatTime(entry.createdAt, locale)}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">{t.noActivity}</p>
        )}
      </section>
    </>
  );
}
