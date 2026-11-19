import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, locales } from "@/i18n/config";
import { getContent } from "@/lib/content";
import { ContentArticle } from "@/components/content-article";
import { PageSkeleton } from "@/components/ui/page-skeleton";

/** Static pages edited in the CMS: about, privacy, terms, cookies… */
export async function generateMetadata({ params }: PageProps<"/[lang]/p/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLocale(lang)) return {};
  const page = await getContent("page", slug, lang);
  if (!page) return { robots: { index: false } };
  return {
    title: page.title,
    description: page.excerpt ?? undefined,
    alternates: { canonical: `/${lang}/p/${slug}`, languages: Object.fromEntries(locales.map((l) => [l, `/${l}/p/${slug}`])) },
  };
}

export default function StaticPage({ params }: PageProps<"/[lang]/p/[slug]">) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-2xl px-4 py-14"><PageSkeleton /></div>}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/[lang]/p/[slug]">["params"] }) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();
  const page = await getContent("page", slug, lang);
  if (!page) notFound();
  return <ContentArticle page={page} />;
}
