import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Check } from "lucide-react";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/get-dictionary";
import { fill, formatList, formatPrice, formatShortDate } from "@/lib/format";
import { findMatches, parseAnswers, type Reason } from "@/lib/matching";
import { PsychologistCard } from "@/components/psychologist-card";
import { buttonClass } from "@/components/ui/form";
import { EmptyState, PageSkeleton } from "@/components/ui/page-skeleton";

export const metadata: Metadata = { robots: { index: false } };

export default async function MatchResultsPage({ params, searchParams }: PageProps<"/[lang]/match/results">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <Suspense fallback={<PageSkeleton />}>
        <Results locale={lang} dict={dict} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

function reasonText(r: Reason, dict: Dictionary, locale: Locale): string {
  const t = dict.match.reasons;
  switch (r.key) {
    case "concerns":
      return fill(t.concerns, { list: formatList(r.concerns.map((c) => dict.taxonomy.concerns[c].toLowerCase()), locale) });
    case "clientType":
      return fill(t.clientType, { who: dict.taxonomy.clientTypes[r.clientType].toLowerCase() });
    case "style":
      return fill(t.style, { list: formatList(r.approaches.map((a) => dict.taxonomy.approaches[a]), locale) });
    case "budget":
      return fill(t.budget, { price: formatPrice(r.priceCents, locale) });
    case "soon":
      return fill(t.soon, { date: formatShortDate(r.date, locale) });
    case "language":
      return fill(t.language, { language: dict.languages[r.language] });
    case "city":
      return fill(t.city, { city: r.city });
  }
}

async function Results({ locale, dict, searchParams }: { locale: Locale; dict: Dictionary; searchParams: PageProps<"/[lang]/match/results">["searchParams"] }) {
  const sp = await searchParams;
  const answers = parseAnswers(sp);
  if (!answers) redirect(`/${locale}/match`);
  const matches = await findMatches(answers, locale, dict.titles);
  const retake = `/${locale}/match?${new URLSearchParams(
    Object.entries(sp).flatMap(([k, v]) => (Array.isArray(v) ? v.map((x) => [k, x]) : v ? [[k, v]] : [])),
  )}`;

  return (
    <>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">{dict.match.resultsTitle}</h1>
      <p className="mt-2 max-w-2xl text-muted">{dict.match.resultsSubtitle}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={retake} className={buttonClass.secondary}>{dict.match.retake}</Link>
        <Link href={`/${locale}/psychologists`} className={buttonClass.secondary}>{dict.match.browseAll}</Link>
      </div>

      {matches.length === 0 ? (
        <div className="mt-8">
          <EmptyState title={dict.match.none} body={dict.match.noneHint} />
        </div>
      ) : (
        <ol className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {matches.map((m) => (
            <li key={m.card.slug}>
              <PsychologistCard
                card={m.card}
                locale={locale}
                dict={dict}
                footer={
                  m.reasons.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-ink">{fill(dict.match.whyMatched, { name: m.card.name.split(" ")[0] })}</p>
                      <ul className="mt-2 space-y-1.5">
                        {m.reasons.map((r) => (
                          <li key={r.key} className="flex gap-2 text-sm text-ink">
                            <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                            {reasonText(r, dict, locale)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                }
              />
            </li>
          ))}
        </ol>
      )}
      <p className="mt-8 text-sm text-muted">{dict.match.disclaimer}</p>
    </>
  );
}
