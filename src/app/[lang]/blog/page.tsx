import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { listArticles } from "@/lib/content";
import { fill, formatShortDate } from "@/lib/format";
import { EmptyState } from "@/components/ui/page-skeleton";

export async function generateMetadata({ params }: PageProps<"/[lang]/blog">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return {
    title: dict.blog.title,
    description: dict.blog.subtitle,
    alternates: { canonical: `/${lang}/blog`, languages: Object.fromEntries(locales.map((l) => [l, `/${l}/blog`])) },
  };
}

export default async function BlogPage({ params }: PageProps<"/[lang]/blog">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const [dict, articles] = await Promise.all([getDictionary(lang), listArticles(lang)]);
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{dict.blog.title}</h1>
      <p className="mt-2 text-muted">{dict.blog.subtitle}</p>
      <div className="mt-8">
        {articles.length === 0 ? (
          <EmptyState title={dict.blog.empty} />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {articles.map((a) => (
              <li key={a.slug}>
                <Link href={`/${lang}/blog/${a.slug}`} className="flex h-full flex-col rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-primary">
                  <h2 className="font-display text-xl font-semibold text-ink" lang={a.locale}>{a.title}</h2>
                  {a.excerpt && <p className="mt-2 text-muted" lang={a.locale}>{a.excerpt}</p>}
                  <p className="mt-auto pt-4 text-sm text-muted">{a.publishedAt && fill(dict.blog.published, { date: formatShortDate(a.publishedAt, lang) })}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
