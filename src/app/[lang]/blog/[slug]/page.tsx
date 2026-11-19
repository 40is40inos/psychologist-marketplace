import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getContent } from "@/lib/content";
import { fill, formatShortDate } from "@/lib/format";
import { ContentArticle } from "@/components/content-article";
import { PageSkeleton } from "@/components/ui/page-skeleton";

export async function generateMetadata({ params }: PageProps<"/[lang]/blog/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLocale(lang)) return {};
  const page = await getContent("article", slug, lang);
  if (!page) return { robots: { index: false } };
  return {
    title: page.title,
    description: page.excerpt ?? undefined,
    alternates: { canonical: `/${lang}/blog/${slug}`, languages: Object.fromEntries(locales.map((l) => [l, `/${l}/blog/${slug}`])) },
    openGraph: { type: "article", title: page.title, description: page.excerpt ?? undefined, publishedTime: page.publishedAt?.toISOString() },
  };
}

export default function ArticlePage({ params }: PageProps<"/[lang]/blog/[slug]">) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-2xl px-4 py-14"><PageSkeleton /></div>}>
      <Article params={params} />
    </Suspense>
  );
}

async function Article({ params }: { params: PageProps<"/[lang]/blog/[slug]">["params"] }) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();
  const [dict, page] = await Promise.all([getDictionary(lang), getContent("article", slug, lang)]);
  if (!page) notFound();
  return (
    <ContentArticle
      page={page}
      back={{ href: `/${lang}/blog`, label: dict.blog.back }}
      meta={page.publishedAt ? fill(dict.blog.published, { date: formatShortDate(page.publishedAt, lang) }) : undefined}
    />
  );
}
