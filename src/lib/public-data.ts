import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import { SESSION_TYPES, type SessionType } from "@/domain/session-types";
import type { Locale } from "@/i18n/config";
import { getAllLabels } from "@/lib/taxonomy-data";
import { getDictionary } from "@/i18n/get-dictionary";
import { publicProfileWhere, searchPsychologists, type PsychologistCard } from "@/lib/search";

/** Cities that have at least one public office, for the location picker. */
export async function getCities(locale: Locale): Promise<{ slug: string; name: string }[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("cities");
  const cities = await db.city.findMany({
    where: { offices: { some: { psychologist: publicProfileWhere } } },
    select: { slug: true, translations: { where: { locale }, select: { name: true } } },
  });
  return cities
    .map((c) => ({ slug: c.slug, name: c.translations[0]?.name ?? c.slug }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));
}

/** Lowest active price per format, for the home page. */
export async function getLowestPrices(): Promise<Record<SessionType, number | null>> {
  "use cache";
  cacheLife("hours");
  const rows = await db.sessionOffering.groupBy({
    by: ["type"],
    where: { active: true, psychologist: publicProfileWhere },
    _min: { priceCents: true },
  });
  return Object.fromEntries(
    SESSION_TYPES.map((t) => [t, rows.find((r) => r.type === t)?._min.priceCents ?? null]),
  ) as Record<SessionType, number | null>;
}

/** Soonest-available psychologists for the home page. */
export async function getFeatured(locale: Locale): Promise<PsychologistCard[]> {
  "use cache";
  cacheLife("minutes");
  const [dict, labels] = await Promise.all([getDictionary(locale), getAllLabels()]);
  const titles = dict.titles;
  const results = await searchPsychologists(
    { q: "", concerns: [], approaches: [], clientTypes: [], format: "", location: "", language: "", gender: "", priceMin: null, priceMax: null, availability: "week", date: "", sort: "earliest" },
    locale,
    labels,
    titles,
  );
  return results.slice(0, 3);
}
