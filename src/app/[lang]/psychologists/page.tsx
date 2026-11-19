import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, locales, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/get-dictionary";
import { cities } from "@/data/demo-therapists";
import { fill } from "@/lib/format";
import { ONLINE, parseFilters, searchTherapists } from "@/lib/search";
import { SearchForm } from "@/components/search-form";
import { TherapistCard } from "@/components/therapist-card";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/psychologists">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return {
    title: dict.results.title,
    alternates: {
      canonical: `/${lang}/psychologists`,
      languages: Object.fromEntries(locales.map((l) => [l, `/${l}/psychologists`])),
    },
  };
}

export default async function PsychologistsPage({
  params,
  searchParams,
}: PageProps<"/[lang]/psychologists">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      {/* Search params are request-time data, so results stream in behind a boundary. */}
      <Suspense fallback={<ResultsSkeleton dict={dict} />}>
        <Results locale={lang} dict={dict} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Results({
  locale,
  dict,
  searchParams,
}: {
  locale: Locale;
  dict: Dictionary;
  searchParams: PageProps<"/[lang]/psychologists">["searchParams"];
}) {
  const filters = parseFilters(await searchParams);
  // Match concern text in every language, not just the current one.
  const allDicts = await Promise.all(locales.map((l) => getDictionary(l)));
  const results = searchTherapists(filters, allDicts);

  const cityName =
    filters.location === ONLINE
      ? dict.results.online
      : cities.find((c) => c.slug === filters.location)?.name[locale];
  const hasFilters = Boolean(filters.concern || filters.location || filters.type);

  return (
    <>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
        {cityName ? fill(dict.results.titleIn, { city: cityName }) : dict.results.title}
      </h1>
      <div className="mt-6">
        <SearchForm locale={locale} dict={dict} filters={filters} />
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted" aria-live="polite">
          {results.length === 1
            ? dict.results.countOne
            : fill(dict.results.count, { count: results.length })}
        </p>
        {hasFilters && (
          <Link href={`/${locale}/psychologists`} className="text-sm font-medium text-primary underline-offset-2 hover:underline">
            {dict.results.clearFilters}
          </Link>
        )}
      </div>

      {results.length > 0 ? (
        <ul className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {results.map((t) => (
            <li key={t.slug}>
              <TherapistCard therapist={t} locale={locale} dict={dict} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
          <p className="font-semibold text-ink">{dict.results.empty}</p>
          <p className="mt-1 text-sm text-muted">{dict.results.emptyHint}</p>
        </div>
      )}
    </>
  );
}

function ResultsSkeleton({ dict }: { dict: Dictionary }) {
  return (
    <div aria-busy="true">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">{dict.results.title}</h1>
      <div className="mt-6 h-[268px] animate-pulse rounded-2xl bg-surface-muted lg:h-[104px]" />
      <ul className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <li key={i} className="h-96 animate-pulse rounded-2xl bg-surface-muted" />
        ))}
      </ul>
    </div>
  );
}
