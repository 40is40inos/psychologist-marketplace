import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { List, Map as MapIcon, SlidersHorizontal, Sparkles } from "lucide-react";
import { isLocale, locales, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/get-dictionary";
import { fill, formatPrice } from "@/lib/format";
import { getCities } from "@/lib/public-data";
import { getAllLabels, getTaxonomy } from "@/lib/taxonomy-data";
import { logSearch, track } from "@/lib/analytics";
import { activeFilterCount, filtersToParams, ONLINE, parseFilters, searchPsychologists } from "@/lib/search";
import { SearchForm } from "@/components/search-form";
import { FilterPanel } from "@/components/search/filter-panel";
import { SortSelect } from "@/components/search/sort-select";
import { PsychologistCard } from "@/components/psychologist-card";
import { LazyMap } from "@/components/map/lazy-map";
import { EmptyState } from "@/components/ui/page-skeleton";

export async function generateMetadata({ params }: PageProps<"/[lang]/psychologists">): Promise<Metadata> {
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

export default async function PsychologistsPage({ params, searchParams }: PageProps<"/[lang]/psychologists">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
      {/* Search params are request-time data, so results stream in. */}
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
  const sp = await searchParams;
  const filters = parseFilters(sp);
  const view = sp.view === "map" ? "map" : "list";
  const [concernLabels, cities, taxonomy] = await Promise.all([getAllLabels(), getCities(locale), getTaxonomy(locale)]);
  const results = await searchPsychologists(filters, locale, concernLabels, dict.titles);
  track(results.map((r) => r.id), "searchAppearances");
  logSearch(filters.q, { ...filters, q: null, sort: null }, results.length, locale);

  const params = filtersToParams(filters);
  const base = `/${locale}/psychologists`;
  const withView = (v: "list" | "map") => {
    const p = new URLSearchParams(params);
    if (v === "map") p.set("view", "map");
    return `${base}${p.size ? `?${p}` : ""}`;
  };
  const cityName = filters.location === ONLINE ? dict.results.online : cities.find((c) => c.slug === filters.location)?.name;
  const count = activeFilterCount(filters);
  const points = results
    .filter((r) => r.coords && r.offerings.some((o) => o.type === "in_person"))
    .map((r) => ({
      slug: r.slug,
      name: r.name,
      lat: r.coords!.lat,
      lng: r.coords!.lng,
      href: `/${locale}/psychologists/${r.slug}`,
      label: `${r.title} · ${fill(dict.profile.from, { price: formatPrice(Math.min(...r.offerings.map((o) => o.priceCents)), locale) })}`,
    }));

  return (
    <>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
        {cityName ? fill(dict.results.titleIn, { city: cityName }) : dict.results.title}
      </h1>
      <div className="mt-5">
        <SearchForm locale={locale} dict={dict} cities={cities} languages={taxonomy.languages} values={filters} keep={params} />
      </div>

      <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[18rem_minmax(0,1fr)]">
        {/* Phones: filters in a drawer. Desktop: sidebar. */}
        <aside aria-label={dict.filters.title}>
          <details className="group rounded-2xl border border-border bg-surface lg:hidden">
            <summary className="flex h-12 cursor-pointer items-center gap-2 px-4 font-semibold text-ink">
              <SlidersHorizontal className="size-5 text-primary" aria-hidden="true" />
              {dict.filters.open}
              {count > 0 && <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-ink">{count}</span>}
            </summary>
            <div className="border-t border-border p-4">
              <FilterPanel locale={locale} dict={dict} filters={filters} view={view} taxonomy={taxonomy} />
            </div>
          </details>
          <div className="sticky top-20 hidden max-h-[calc(100vh-6rem)] overflow-y-auto rounded-2xl border border-border bg-surface p-5 lg:block">
            <h2 className="mb-4 text-lg font-semibold text-ink">{dict.filters.title}</h2>
            <FilterPanel locale={locale} dict={dict} filters={filters} view={view} taxonomy={taxonomy} />
          </div>
        </aside>

        <section aria-labelledby="results-count">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p id="results-count" className="text-sm text-muted" aria-live="polite">
              {results.length === 1 ? dict.results.countOne : fill(dict.results.count, { count: results.length })}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <SortSelect current={filters.sort} params={params.toString()} label={dict.filters.sort} labels={dict.filters.sorts} basePath={base} />
              <div className="inline-flex rounded-lg border border-border p-0.5" role="group">
                {(["list", "map"] as const).map((v) => {
                  const Icon = v === "list" ? List : MapIcon;
                  return (
                    <Link
                      key={v}
                      href={withView(v)}
                      aria-current={view === v ? "true" : undefined}
                      className={`inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium ${view === v ? "bg-primary-soft text-primary" : "text-muted hover:text-ink"}`}
                    >
                      <Icon className="size-4" aria-hidden="true" />
                      {dict.filters[v]}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {view === "map" && (
            <div className="mt-4 space-y-2">
              <p className="text-sm text-muted">{dict.filters.mapNote}</p>
              {points.length ? <LazyMap points={points} /> : <EmptyState title={dict.filters.noMapResults} />}
            </div>
          )}

          {results.length > 0 ? (
            <ul className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {results.map((card) => (
                <li key={card.slug}>
                  <PsychologistCard card={card} locale={locale} dict={dict} labels={taxonomy.labels} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-4">
              <EmptyState title={dict.results.empty} body={dict.results.emptyHint}>
                <div className="flex flex-wrap justify-center gap-2">
                  <Link href={base} className="inline-flex h-11 items-center rounded-xl border border-border px-4 font-semibold text-ink hover:border-primary">
                    {dict.results.clearFilters}
                  </Link>
                  <Link href={`/${locale}/match`} className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 font-semibold text-primary-ink">
                    <Sparkles className="size-4" aria-hidden="true" />
                    {dict.match.cta}
                  </Link>
                </div>
              </EmptyState>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function ResultsSkeleton({ dict }: { dict: Dictionary }) {
  return (
    <div aria-busy="true">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">{dict.results.title}</h1>
      <div className="mt-5 h-[300px] animate-pulse rounded-2xl bg-surface-muted sm:h-[190px] lg:h-[104px]" />
      <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <div className="h-12 animate-pulse rounded-2xl bg-surface-muted lg:h-[600px]" />
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => <li key={i} className="h-96 animate-pulse rounded-2xl bg-surface-muted" />)}
        </ul>
      </div>
    </div>
  );
}
