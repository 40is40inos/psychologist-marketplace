import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

/**
 * Concerns, approaches, client types and session languages come from the
 * database so admins can add, rename, reorder or hide them. Labels fall back
 * to the built-in dictionaries, then to the slug.
 */
export interface TaxonomyItem {
  slug: string;
  label: string;
}

export interface Taxonomy {
  concerns: TaxonomyItem[];
  approaches: TaxonomyItem[];
  clientTypes: TaxonomyItem[];
  languages: TaxonomyItem[];
  /** slug/code -> label, including inactive items (for existing profiles). */
  labels: Record<string, string>;
}

export async function getTaxonomy(locale: Locale): Promise<Taxonomy> {
  "use cache";
  cacheLife("hours");
  cacheTag("taxonomy");

  const [dict, specialties, languages] = await Promise.all([
    getDictionary(locale),
    db.specialty.findMany({ orderBy: [{ sortOrder: "asc" }, { slug: "asc" }] }),
    db.language.findMany({ orderBy: [{ sortOrder: "asc" }, { code: "asc" }] }),
  ]);
  const fallback: Record<string, string> = {
    ...dict.taxonomy.concerns,
    ...dict.taxonomy.approaches,
    ...dict.taxonomy.clientTypes,
    ...dict.languages,
  };
  const labelOf = (key: string, labels: unknown) => ((labels ?? {}) as Record<string, string>)[locale] || fallback[key] || key;

  const labels: Record<string, string> = {};
  const byKind: Record<string, TaxonomyItem[]> = { concern: [], approach: [], client_type: [] };
  for (const s of specialties) {
    const label = labelOf(s.slug, s.labels);
    labels[s.slug] = label;
    if (s.active) byKind[s.kind].push({ slug: s.slug, label });
  }
  const langs: TaxonomyItem[] = [];
  for (const l of languages) {
    const label = labelOf(l.code, l.labels);
    labels[l.code] = label;
    if (l.active) langs.push({ slug: l.code, label });
  }
  return { concerns: byKind.concern, approaches: byKind.approach, clientTypes: byKind.client_type, languages: langs, labels };
}

/** Taxonomy in every locale, for matching free-text searches across languages. */
export async function getAllLabels(): Promise<Record<string, string[]>> {
  "use cache";
  cacheLife("hours");
  cacheTag("taxonomy");
  const [el, en] = await Promise.all([getTaxonomy("el"), getTaxonomy("en")]);
  const out: Record<string, string[]> = {};
  for (const t of [el, en]) for (const c of t.concerns) (out[c.slug] ??= []).push(c.label);
  return out;
}
