import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import type { Locale } from "@/i18n/config";

export interface ContentView {
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  coverUrl: string | null;
  publishedAt: Date | null;
  /** Locale the text is in (falls back when not translated). */
  locale: Locale;
}

function pick<T extends { locale: Locale }>(translations: T[], locale: Locale): T | undefined {
  return translations.find((t) => t.locale === locale) ?? translations[0];
}

/** A published article or page, cached until an admin edits content. */
export async function getContent(kind: "article" | "page", slug: string, locale: Locale): Promise<ContentView | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("content");
  const page = await db.contentPage.findUnique({ where: { kind_slug: { kind, slug } }, include: { translations: true } });
  if (!page || page.status !== "published") return null;
  const t = pick(page.translations, locale);
  if (!t) return null;
  return { slug: page.slug, title: t.title, excerpt: t.excerpt, body: t.body, coverUrl: page.coverUrl, publishedAt: page.publishedAt, locale: t.locale };
}

export async function listArticles(locale: Locale): Promise<Omit<ContentView, "body">[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("content");
  const pages = await db.contentPage.findMany({
    where: { kind: "article", status: "published" },
    orderBy: { publishedAt: "desc" },
    take: 50,
    include: { translations: true },
  });
  return pages.flatMap((p) => {
    const t = pick(p.translations, locale);
    return t ? [{ slug: p.slug, title: t.title, excerpt: t.excerpt, coverUrl: p.coverUrl, publishedAt: p.publishedAt, locale: t.locale }] : [];
  });
}
