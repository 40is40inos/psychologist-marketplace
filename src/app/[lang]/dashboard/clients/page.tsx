import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/get-dictionary";
import { db } from "@/lib/db";
import { fill, formatShortDate } from "@/lib/format";
import { requirePsychologist } from "@/lib/workspace";
import { EmptyState, PageSkeleton } from "@/components/ui/page-skeleton";

export const metadata: Metadata = { robots: { index: false } };

export default async function ClientsPage({ params }: PageProps<"/[lang]/dashboard/clients">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Clients locale={lang} dict={dict} />
    </Suspense>
  );
}

async function Clients({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const { profileId } = await requirePsychologist(locale, `/${locale}/dashboard/clients`);
  const t = dict.clientsPage;
  const now = new Date();
  const appts = await db.appointment.findMany({
    where: { psychologistId: profileId, status: { notIn: ["cancelled_by_client", "cancelled_by_psychologist"] } },
    orderBy: { startsAt: "asc" },
    select: { clientId: true, startsAt: true, status: true, client: { select: { name: true } } },
  });

  const byClient = new Map<string, { name: string; count: number; last?: Date; next?: Date }>();
  for (const a of appts) {
    const c = byClient.get(a.clientId) ?? { name: a.client.name, count: 0 };
    if (a.startsAt < now) {
      if (a.status === "completed") c.count++;
      c.last = a.startsAt;
    } else c.next ??= a.startsAt;
    byClient.set(a.clientId, c);
  }
  const clients = [...byClient.entries()].sort((a, b) => +(b[1].last ?? b[1].next ?? 0) - +(a[1].last ?? a[1].next ?? 0));

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold text-ink">{t.title}</h1>
      {clients.length === 0 ? (
        <EmptyState title={t.empty} />
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
          {clients.map(([id, c]) => (
            <li key={id}>
              <Link href={`/${locale}/dashboard/clients/${id}`} className="flex items-center gap-4 p-4 hover:bg-surface-muted">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink">{c.name}</p>
                  <p className="text-sm text-muted">
                    {fill(t.sessions, { count: c.count })}
                    {c.next && ` · ${fill(t.next, { date: formatShortDate(c.next, locale) })}`}
                    {!c.next && c.last && ` · ${fill(t.last, { date: formatShortDate(c.last, locale) })}`}
                  </p>
                </div>
                <ChevronRight className="size-4 text-muted" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
