import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MessageCircle, Sparkles } from "lucide-react";
import { isLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { FaqList, faqJsonLd, JsonLd } from "@/components/faq-list";
import { buttonClass } from "@/components/ui/form";

export async function generateMetadata({ params }: PageProps<"/[lang]/faq">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = (await getDictionary(lang)).faqPage;
  return {
    title: t.metaTitle,
    description: t.metaDescription,
    alternates: { canonical: `/${lang}/faq`, languages: Object.fromEntries(locales.map((l) => [l, `/${l}/faq`])) },
  };
}

export default async function FaqPage({ params }: PageProps<"/[lang]/faq">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const t = dict.faqPage;

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 py-10 sm:px-6 sm:py-14">
      <JsonLd data={faqJsonLd(t.sections.flatMap((s) => s.items))} />
      <header className="space-y-3">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{t.title}</h1>
        <p className="text-lg leading-relaxed text-muted">{t.intro}</p>
      </header>

      {t.sections.map((s) => (
        <section key={s.title} className="space-y-4">
          <h2 className="text-xl font-semibold text-ink">{s.title}</h2>
          <FaqList items={s.items} />
        </section>
      ))}

      <div className="flex flex-wrap gap-3 border-t border-border pt-8">
        <Link href={`/${lang}/match`} className={buttonClass.primary}>
          <Sparkles className="size-4" aria-hidden="true" />
          {dict.match.cta}
        </Link>
        <Link href={`/${lang}/contact`} className={buttonClass.secondary}>
          <MessageCircle className="size-4" aria-hidden="true" />
          {t.contactCta}
        </Link>
      </div>
    </div>
  );
}
