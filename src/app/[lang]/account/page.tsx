import { Suspense } from "react";
import { displayName } from "@/lib/slug";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MessageSquareHeart } from "lucide-react";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/get-dictionary";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { fill } from "@/lib/format";
import { AppointmentRow } from "@/components/appointment-row";
import { buttonClass, FormAlert } from "@/components/ui/form";
import { EmptyState, PageSkeleton } from "@/components/ui/page-skeleton";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: dict.nav.myAccount, robots: { index: false } };
}

/** Client area: upcoming and past sessions. */
export default async function AccountPage({ params, searchParams }: PageProps<"/[lang]/account">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Account locale={lang} dict={dict} searchParams={searchParams} />
    </Suspense>
  );
}

async function Account({ locale, dict, searchParams }: { locale: Locale; dict: Dictionary; searchParams: PageProps<"/[lang]/account">["searchParams"] }) {
  const user = await requireRole(locale, "client", `/${locale}/account`);
  const sp = await searchParams;
  const now = new Date();

  const appointments = await db.appointment.findMany({
    // Hide the old half of a reschedule; the new appointment replaces it.
    where: { clientId: user.id, rescheduledTo: null },
    orderBy: { startsAt: "asc" },
    take: 200,
    select: {
      id: true, startsAt: true, sessionType: true, kind: true, status: true, priceCents: true, lateCancellation: true,
      feedback: { select: { id: true } },
      psychologist: { select: { user: { select: { name: true } } } },
    },
  });

  const rows = appointments.map((a) => ({
    ...a,
    counterpart: displayName(a.psychologist.user.name, locale),
    upcoming: a.startsAt >= now && (a.status === "pending" || a.status === "confirmed"),
  }));
  const upcoming = rows.filter((r) => r.upcoming);
  const past = rows.filter((r) => !r.upcoming).reverse();
  const base = `/${locale}/account/appointments`;

  return (
    <>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
        {fill(dict.account.title, { name: user.name.split(" ")[0] })}
      </h1>
      <p className="mt-1 text-muted">{dict.account.subtitle}</p>
      {sp.cancelled && (
        <div className="mt-4">
          <FormAlert tone="success">{dict.account.cancelled}</FormAlert>
        </div>
      )}

      <section className="mt-8" aria-labelledby="upcoming">
        <h2 id="upcoming" className="text-lg font-semibold text-ink">{dict.account.upcoming}</h2>
        {upcoming.length ? (
          <ul className="mt-2 divide-y divide-border rounded-2xl border border-border bg-surface px-4 sm:px-5">
            {upcoming.map((a) => (
              <AppointmentRow key={a.id} a={a} locale={locale} dict={dict} withPrefix href={`${base}/${a.id}`} />
            ))}
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
            {past.map((a) => (
              <AppointmentRow
                key={a.id}
                a={a}
                locale={locale}
                dict={dict}
                withPrefix
                href={`${base}/${a.id}`}
                extra={
                  a.status === "completed" && a.kind === "session" ? (
                    a.feedback ? (
                      <p className="pb-3 text-sm text-muted">{dict.account.feedbackGiven}</p>
                    ) : (
                      <Link href={`${base}/${a.id}#feedback`} className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
                        <MessageSquareHeart className="size-4" aria-hidden="true" />
                        {dict.account.feedbackCta}
                      </Link>
                    )
                  ) : null
                }
              />
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">{dict.account.noPast}</p>
        )}
      </section>
    </>
  );
}
