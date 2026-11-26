import { privatePageMetadata } from "@/lib/page-metadata";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/get-dictionary";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { fill, formatShortDate } from "@/lib/format";
import { DisputeCard } from "@/components/admin/dispute-card";
import { EmptyState, PageSkeleton } from "@/components/ui/page-skeleton";

export const generateMetadata = privatePageMetadata((d) => d.admin.disputes.title);

export default async function DisputesPage({ params }: PageProps<"/[lang]/admin/disputes">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Disputes locale={lang} dict={dict} />
    </Suspense>
  );
}

async function Disputes({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  await requireRole(locale, "admin", `/${locale}/admin/disputes`);
  const t = dict.admin.disputes;

  const disputes = await db.dispute.findMany({
    // Open and in-review first, then most recent.
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 50,
    include: {
      openedBy: { select: { name: true } },
      appointment: {
        select: { startsAt: true, psychologist: { select: { user: { select: { name: true } } } } },
      },
    },
  });

  return (
    <>
      <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">{t.title}</h1>
      <div className="mt-6">
        {disputes.length ? (
          <ul className="grid gap-4 lg:grid-cols-2">
            {disputes.map((d) => (
              <DisputeCard
                key={d.id}
                t={t}
                item={{
                  id: d.id,
                  status: d.status,
                  openedBy: fill(t.openedBy, { name: d.openedBy.name }),
                  session: fill(t.session, {
                    date: formatShortDate(d.appointment.startsAt, locale),
                    psychologist: d.appointment.psychologist.user.name,
                  }),
                  reason: d.reason,
                  resolution: d.resolution,
                  created: formatShortDate(d.createdAt, locale),
                }}
              />
            ))}
          </ul>
        ) : (
          <EmptyState title={t.empty} />
        )}
      </div>
    </>
  );
}
