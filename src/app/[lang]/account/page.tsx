import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/get-dictionary";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { fill } from "@/lib/format";
import { AppointmentRow, type AppointmentRowData } from "@/components/appointment-row";
import { buttonClass } from "@/components/ui/form";
import { EmptyState, PageSkeleton } from "@/components/ui/page-skeleton";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: dict.nav.myAccount, robots: { index: false } };
}

/** Client area: upcoming and past sessions. */
export default async function AccountPage({ params }: PageProps<"/[lang]/account">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <Suspense fallback={<PageSkeleton />}>
        <Account locale={lang} dict={dict} />
      </Suspense>
    </div>
  );
}

async function Account({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const user = await requireRole(locale, "client", `/${locale}/account`);
  const now = new Date();

  const appointments = await db.appointment.findMany({
    where: { clientId: user.id },
    orderBy: { startsAt: "asc" },
    take: 100,
    select: {
      id: true,
      startsAt: true,
      sessionType: true,
      status: true,
      priceCents: true,
      psychologist: { select: { user: { select: { name: true } } } },
    },
  });

  const rows: (AppointmentRowData & { upcoming: boolean })[] = appointments.map((a) => ({
    id: a.id,
    startsAt: a.startsAt,
    sessionType: a.sessionType,
    status: a.status,
    priceCents: a.priceCents,
    counterpart: a.psychologist.user.name,
    upcoming: a.startsAt >= now && (a.status === "pending" || a.status === "confirmed"),
  }));
  const upcoming = rows.filter((r) => r.upcoming);
  const past = rows.filter((r) => !r.upcoming).reverse();

  return (
    <>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
        {fill(dict.account.title, { name: user.name.split(" ")[0] })}
      </h1>
      <p className="mt-1 text-muted">{dict.account.subtitle}</p>

      <section className="mt-8" aria-labelledby="upcoming">
        <h2 id="upcoming" className="text-lg font-semibold text-ink">{dict.account.upcoming}</h2>
        {upcoming.length ? (
          <ul className="mt-2 divide-y divide-border rounded-2xl border border-border bg-surface px-4 sm:px-5">
            {upcoming.map((a) => <AppointmentRow key={a.id} a={a} locale={locale} dict={dict} withPrefix />)}
          </ul>
        ) : (
          <div className="mt-3">
            <EmptyState title={dict.account.noUpcoming} body={dict.account.noUpcomingHint}>
              <Link href={`/${locale}/psychologists`} className={buttonClass.primary}>{dict.account.findCta}</Link>
            </EmptyState>
          </div>
        )}
      </section>

      <section className="mt-10" aria-labelledby="past">
        <h2 id="past" className="text-lg font-semibold text-ink">{dict.account.past}</h2>
        {past.length ? (
          <ul className="mt-2 divide-y divide-border rounded-2xl border border-border bg-surface px-4 sm:px-5">
            {past.map((a) => <AppointmentRow key={a.id} a={a} locale={locale} dict={dict} withPrefix />)}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">{dict.account.noPast}</p>
        )}
      </section>
    </>
  );
}
