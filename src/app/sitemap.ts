import type { MetadataRoute } from "next";
import { brand } from "@/config/brand";
import { locales, type Locale } from "@/i18n/config";
import { db } from "@/lib/db";
import { publicProfileWhere } from "@/lib/search";
import { CITY_PREFIX, seoCities, seoConcerns } from "@/lib/seo-pages";

/** Public, indexable pages in every language, with hreflang alternates. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = brand.siteUrl.replace(/\/$/, "");
  const entry = (path: string, priority: number, lastModified?: Date): MetadataRoute.Sitemap[number] => ({
    url: `${base}/${locales[0]}${path}`,
    lastModified,
    priority,
    alternates: { languages: Object.fromEntries(locales.map((l) => [l, `${base}/${l}${path}`])) },
  });

  const [profiles, content, concerns, cities] = await Promise.all([
    db.psychologistProfile.findMany({ where: publicProfileWhere, select: { slug: true, updatedAt: true } }),
    db.contentPage.findMany({ where: { status: "published" }, select: { kind: true, slug: true, updatedAt: true } }),
    seoConcerns(locales[0] as Locale),
    seoCities(locales[0] as Locale),
  ]);

  return [
    entry("", 1),
    entry("/psychologists", 0.9),
    entry("/match", 0.7),
    entry("/for-psychologists", 0.7),
    entry("/faq", 0.5),
    entry("/contact", 0.4),
    entry("/urgent-help", 0.6),
    entry("/blog", 0.6),
    ...concerns.map((c) => entry(`/${c.slug}`, 0.8)),
    ...cities.map((c) => entry(`/${CITY_PREFIX}${c.slug}`, 0.8)),
    ...profiles.map((p) => entry(`/psychologists/${p.slug}`, 0.7, p.updatedAt)),
    // CMS copy for concern/city pages is shown on those pages, not on its own.
    ...content
      .filter((c) => !/^(concern|city)-/.test(c.slug))
      .map((c) => entry(c.kind === "article" ? `/blog/${c.slug}` : `/p/${c.slug}`, c.kind === "article" ? 0.6 : 0.3, c.updatedAt)),
  ];
}
