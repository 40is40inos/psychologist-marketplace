import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getAllLabels, getTaxonomy } from "@/lib/taxonomy-data";
import { ONLINE, publicProfileWhere, searchPsychologists, type PsychologistCard, type SearchFilters } from "@/lib/search";
import type { Concern } from "@/domain/taxonomy";

/**
 * Landing pages for search engines: one per concern (/el/anxiety) and one per
 * city (/el/psychologists-athens). Optional editorial copy comes from CMS
 * pages named "concern-<slug>" / "city-<slug>", so it can be written in the
 * admin panel without a deploy.
 */
export const CITY_PREFIX = "psychologists-";

const NO_FILTERS: SearchFilters = {
  q: "", concerns: [], approaches: [], clientTypes: [], format: "", location: "", language: "", gender: "",
  priceMin: null, priceMax: null, availability: "", date: "", sort: "earliest",
};

export interface Listing {
  cards: PsychologistCard[];
  total: number;
  lowestPriceCents: number | null;
  onlineCount: number;
}

function summarise(cards: PsychologistCard[]): Listing {
  const prices = cards.flatMap((c) => c.offerings.map((o) => o.priceCents));
  return {
    cards: cards.slice(0, 9),
    total: cards.length,
    lowestPriceCents: prices.length ? Math.min(...prices) : null,
    onlineCount: cards.filter((c) => c.offerings.some((o) => o.type !== "in_person")).length,
  };
}

async function search(filters: Partial<SearchFilters>, locale: Locale) {
  const [dict, labels] = await Promise.all([getDictionary(locale), getAllLabels()]);
  return searchPsychologists({ ...NO_FILTERS, ...filters }, locale, labels, dict.titles);
}

export async function concernListing(concern: string, locale: Locale): Promise<Listing> {
  "use cache";
  cacheLife("minutes");
  cacheTag("seo-pages");
  return summarise(await search({ concerns: [concern as Concern] }, locale));
}

export async function cityListing(city: string, locale: Locale): Promise<Listing & { online: Listing }> {
  "use cache";
  cacheLife("minutes");
  cacheTag("seo-pages");
  const [here, online] = await Promise.all([search({ location: city }, locale), search({ location: ONLINE }, locale)]);
  return { ...summarise(here), online: summarise(online) };
}

/** Active concerns with at least one public psychologist (pages worth indexing). */
export async function seoConcerns(locale: Locale): Promise<{ slug: string; label: string }[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("taxonomy", "seo-pages");
  const [taxonomy, used] = await Promise.all([
    getTaxonomy(locale),
    db.specialty.findMany({
      where: { kind: "concern", active: true, psychologists: { some: { psychologist: publicProfileWhere } } },
      select: { slug: true },
    }),
  ]);
  const has = new Set(used.map((u) => u.slug));
  return taxonomy.concerns.filter((c) => has.has(c.slug));
}

/** Cities with at least one public office. */
export async function seoCities(locale: Locale): Promise<{ slug: string; name: string }[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("cities", "seo-pages");
  const cities = await db.city.findMany({
    where: { offices: { some: { psychologist: publicProfileWhere } } },
    select: { slug: true, translations: { where: { locale }, select: { name: true } } },
  });
  return cities.map((c) => ({ slug: c.slug, name: c.translations[0]?.name ?? c.slug })).sort((a, b) => a.name.localeCompare(b.name, locale));
}

/** Resolve "/anxiety" or "/psychologists-athens" to what it is. */
export async function resolveTopic(topic: string, locale: Locale): Promise<{ kind: "concern"; slug: string; label: string } | { kind: "city"; slug: string; name: string } | null> {
  if (topic.startsWith(CITY_PREFIX)) {
    const city = (await seoCities(locale)).find((c) => c.slug === topic.slice(CITY_PREFIX.length));
    return city ? { kind: "city", ...city } : null;
  }
  const taxonomy = await getTaxonomy(locale);
  const concern = taxonomy.concerns.find((c) => c.slug === topic);
  return concern ? { kind: "concern", ...concern } : null;
}
