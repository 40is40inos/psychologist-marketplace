import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight, BadgeCheck, ChevronRight, Globe2, ReceiptEuro, Users } from "lucide-react";
import { brand } from "@/config/brand";
import { isLocale, locales, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/get-dictionary";
import { getContent } from "@/lib/content";
import { fill, formatPrice } from "@/lib/format";
import { Markdown } from "@/lib/markdown";
import { CITY_PREFIX, cityListing, concernListing, resolveTopic, seoCities, seoConcerns, type Listing } from "@/lib/seo-pages";
import { getTaxonomy } from "@/lib/taxonomy-data";
import { PsychologistCard } from "@/components/psychologist-card";
import { breadcrumbJsonLd, FaqList, faqJsonLd, JsonLd } from "@/components/faq-list";
import { buttonClass } from "@/components/ui/form";
import { EmptyState, PageSkeleton } from "@/components/ui/page-skeleton";

/**
 * SEO landing pages: /el/anxiety (a concern) and /el/psychologists-athens (a
 * city). Static routes (/el/blog, /el/match…) take precedence over this one.
 */
export async function generateStaticParams({ params }: { params: { lang: string } }) {
  if (!isLocale(params.lang)) return [];
  const [concerns, cities] = await Promise.all([seoConcerns(params.lang), seoCities(params.lang)]);
  const topics = [...concerns.map((c) => c.slug), ...cities.map((c) => `${CITY_PREFIX}${c.slug}`)];
  return (topics.length ? topics : ["anxiety"]).map((topic) => ({ topic }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/[topic]">): Promise<Metadata> {
  const { lang, topic } = await params;
  if (!isLocale(lang)) return {};
  const [dict, found] = await Promise.all([getDictionary(lang), resolveTopic(topic, lang)]);
  if (!found) return { robots: { index: false } };
  const t = dict.seo;
  const title = found.kind === "concern" ? fill(t.concernMetaTitle, { concern: found.label }) : fill(t.cityMetaTitle, { city: found.name });
  const description = found.kind === "concern" ? fill(t.concernMeta, { concern: found.label }) : fill(t.cityMeta, { city: found.name });
  return {
    title,
    description,
    alternates: { canonical: `/${lang}/${topic}`, languages: Object.fromEntries(locales.map((l) => [l, `/${l}/${topic}`])) },
    openGraph: { title, description },
  };
}

export default function TopicPage({ params }: PageProps<"/[lang]/[topic]">) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <Suspense fallback={<PageSkeleton />}>
        <Topic params={params} />
      </Suspense>
    </div>
  );
}

async function Topic({ params }: { params: PageProps<"/[lang]/[topic]">["params"] }) {
  const { lang, topic } = await params;
  if (!isLocale(lang)) notFound();
  const found = await resolveTopic(topic, lang);
  if (!found) notFound();
  const dict = await getDictionary(lang);
  return found.kind === "concern" ? (
    <ConcernView lang={lang} dict={dict} slug={found.slug} label={found.label} />
  ) : (
    <CityView lang={lang} dict={dict} slug={found.slug} name={found.name} />
  );
}

async function ConcernView({ lang, dict, slug, label }: { lang: Locale; dict: Dictionary; slug: string; label: string }) {
  const t = dict.seo;
  const [listing, cities, concerns, taxonomy, extra] = await Promise.all([
    concernListing(slug, lang),
    seoCities(lang),
    seoConcerns(lang),
    getTaxonomy(lang),
    getContent("page", `concern-${slug}`, lang),
  ]);
  const searchHref = `/${lang}/psychologists?concerns=${slug}`;
  const faq = faqItems(dict, label, listing, lang);

  return (
    <article className="space-y-12">
      <JsonLd data={faqJsonLd(faq)} />
      <JsonLd data={breadcrumbJsonLd(brand.siteUrl, [{ name: t.breadcrumbHome, path: `/${lang}` }, { name: dict.nav.findPsychologist, path: `/${lang}/psychologists` }, { name: label, path: `/${lang}/${slug}` }])} />
      <Header lang={lang} dict={dict} crumb={label} title={fill(t.concernTitle, { concern: label })} intro={fill(t.concernIntro, { concern: label.toLowerCase() })} listing={listing} />
      {extra && <div className="max-w-3xl"><Markdown source={extra.body} /></div>}
      <Cards lang={lang} dict={dict} listing={listing} labels={taxonomy.labels} href={searchHref} />

      {cities.length > 0 && (
        <LinkCloud title={t.byCity} links={cities.map((c) => ({ href: `${searchHref}&location=${c.slug}`, label: fill(t.inCity, { concern: label, city: c.name }) }))} />
      )}
      <LinkCloud title={t.otherConcerns} links={concerns.filter((c) => c.slug !== slug).map((c) => ({ href: `/${lang}/${c.slug}`, label: c.label }))} />
      <Faq title={t.faqTitle} items={faq} />
    </article>
  );
}

async function CityView({ lang, dict, slug, name }: { lang: Locale; dict: Dictionary; slug: string; name: string }) {
  const t = dict.seo;
  const [listing, cities, concerns, taxonomy, extra] = await Promise.all([
    cityListing(slug, lang),
    seoCities(lang),
    seoConcerns(lang),
    getTaxonomy(lang),
    getContent("page", `city-${slug}`, lang),
  ]);
  const searchHref = `/${lang}/psychologists?location=${slug}`;
  const faq = faqItems(dict, name, listing, lang);

  return (
    <article className="space-y-12">
      <JsonLd data={faqJsonLd(faq)} />
      <JsonLd data={breadcrumbJsonLd(brand.siteUrl, [{ name: t.breadcrumbHome, path: `/${lang}` }, { name: dict.nav.findPsychologist, path: `/${lang}/psychologists` }, { name, path: `/${lang}/${CITY_PREFIX}${slug}` }])} />
      <Header lang={lang} dict={dict} crumb={name} title={fill(t.cityTitle, { city: name })} intro={fill(t.cityIntro, { city: name })} listing={listing} />
      {extra && <div className="max-w-3xl"><Markdown source={extra.body} /></div>}
      <Cards lang={lang} dict={dict} listing={listing} labels={taxonomy.labels} href={searchHref} />

      {listing.online.total > 0 && (
        <section className="flex flex-col gap-4 rounded-3xl border border-primary/30 bg-primary-soft/50 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-ink"><Globe2 className="size-5 text-primary" aria-hidden="true" />{t.onlineTitle}</h2>
            <p className="mt-1 text-muted">{fill(t.onlineBody, { count: listing.online.total })}</p>
          </div>
          <Link href={`/${lang}/psychologists?location=online`} className={buttonClass.secondary}>{t.onlineCta}</Link>
        </section>
      )}

      <LinkCloud title={fill(t.concernsInCity, { city: name })} links={concerns.map((c) => ({ href: `${searchHref}&concerns=${c.slug}`, label: c.label }))} />
      {cities.length > 1 && (
        <LinkCloud title={t.byCity} links={cities.filter((c) => c.slug !== slug).map((c) => ({ href: `/${lang}/${CITY_PREFIX}${c.slug}`, label: fill(t.cityTitle, { city: c.name }) }))} />
      )}
      <Faq title={t.faqTitle} items={faq} />
    </article>
  );
}

function faqItems(dict: Dictionary, topic: string, listing: Listing, lang: Locale) {
  const fromLine = listing.lowestPriceCents !== null ? fill(dict.seo.fromLine, { price: formatPrice(listing.lowestPriceCents, lang) }) : "";
  return dict.seo.faq.map((f) => ({ q: fill(f.q, { topic: topic.toLowerCase() }), a: fill(f.a, { fromLine }).trim() }));
}

function Header({ lang, dict, crumb, title, intro, listing }: { lang: Locale; dict: Dictionary; crumb: string; title: string; intro: string; listing: Listing }) {
  const t = dict.seo;
  return (
    <header className="space-y-5">
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1 text-sm text-muted">
          <li><Link href={`/${lang}`} className="hover:text-ink hover:underline">{t.breadcrumbHome}</Link></li>
          <li aria-hidden="true"><ChevronRight className="size-3.5" /></li>
          <li><Link href={`/${lang}/psychologists`} className="hover:text-ink hover:underline">{dict.nav.findPsychologist}</Link></li>
          <li aria-hidden="true"><ChevronRight className="size-3.5" /></li>
          <li aria-current="page" className="text-ink">{crumb}</li>
        </ol>
      </nav>
      <h1 className="max-w-3xl font-display text-3xl font-semibold tracking-tight text-ink text-balance sm:text-4xl">{title}</h1>
      <p className="max-w-3xl text-lg leading-relaxed text-muted text-pretty">{intro}</p>
      {listing.total > 0 && (
        <ul className="flex flex-wrap gap-2 text-sm">
          <Stat icon={<Users className="size-4" aria-hidden="true" />}>{fill(t.statCount, { count: listing.total })}</Stat>
          {listing.lowestPriceCents !== null && <Stat icon={<ReceiptEuro className="size-4" aria-hidden="true" />}>{fill(t.statFrom, { price: formatPrice(listing.lowestPriceCents, lang) })}</Stat>}
          {listing.onlineCount > 0 && <Stat icon={<Globe2 className="size-4" aria-hidden="true" />}>{fill(t.statOnline, { count: listing.onlineCount })}</Stat>}
          <Stat icon={<BadgeCheck className="size-4" aria-hidden="true" />}>{t.statVerified}</Stat>
        </ul>
      )}
    </header>
  );
}

function Stat({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return <li className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-ink"><span className="text-primary">{icon}</span>{children}</li>;
}

function Cards({ lang, dict, listing, labels, href }: { lang: Locale; dict: Dictionary; listing: Listing; labels: Record<string, string>; href: string }) {
  if (!listing.total) {
    return (
      <EmptyState scene="search" title={dict.seo.empty}>
        <Link href={`/${lang}/psychologists?location=online`} className={buttonClass.secondary}>{dict.seo.onlineCta}</Link>
      </EmptyState>
    );
  }
  return (
    <section className="space-y-6">
      <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {listing.cards.map((card) => (
          <li key={card.slug}><PsychologistCard card={card} locale={lang} dict={dict} labels={labels} /></li>
        ))}
      </ul>
      <Link href={href} className={buttonClass.primary}>
        {listing.total > listing.cards.length ? fill(dict.seo.seeAll, { count: listing.total }) : dict.seo.seeAllShort}
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </section>
  );
}

function LinkCloud({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  if (!links.length) return null;
  return (
    <section>
      <h2 className="text-xl font-semibold text-ink">{title}</h2>
      <ul className="mt-4 flex flex-wrap gap-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="inline-flex min-h-10 items-center rounded-full border border-border bg-surface px-4 text-sm font-medium text-ink transition-colors hover:border-primary hover:text-primary">{l.label}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Faq({ title, items }: { title: string; items: { q: string; a: string }[] }) {
  return (
    <section className="max-w-3xl">
      <h2 className="mb-4 text-xl font-semibold text-ink">{title}</h2>
      <FaqList items={items} />
    </section>
  );
}
