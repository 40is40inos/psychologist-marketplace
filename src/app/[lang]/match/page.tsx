import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/get-dictionary";
import { getCities } from "@/lib/public-data";
import { getTaxonomy } from "@/lib/taxonomy-data";
import { Questionnaire } from "@/components/match/questionnaire";

export async function generateMetadata({ params }: PageProps<"/[lang]/match">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: dict.match.cta, description: dict.match.ctaBody };
}

export default async function MatchPage({ params, searchParams }: PageProps<"/[lang]/match">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <div className="bg-gradient-to-b from-primary-soft/50 to-bg">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink text-balance sm:text-4xl">{dict.match.title}</h1>
        <p className="mt-2 text-muted">{dict.match.subtitle}</p>
        <div className="mt-8 rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-8">
          {/* "Change my answers" links back here with the previous answers. */}
          <Suspense fallback={<div className="h-96" />}>
            <Form locale={lang} dict={dict} searchParams={searchParams} />
          </Suspense>
        </div>
        <p className="mt-6 text-sm text-muted">{dict.match.disclaimer}</p>
      </div>
    </div>
  );
}

async function Form({ locale, dict, searchParams }: { locale: Locale; dict: Dictionary; searchParams: PageProps<"/[lang]/match">["searchParams"] }) {
  const [cities, initial, taxonomy] = await Promise.all([getCities(locale), searchParams, getTaxonomy(locale)]);
  return (
    <Questionnaire
      action={`/${locale}/match/results`}
      t={dict.match}
      concerns={taxonomy.concerns}
      genders={dict.taxonomy.genders}
      languages={taxonomy.languages}
      cities={cities}
      initial={initial}
      safety={{ urgentHelp: dict.urgentHelp, risk: dict.risk }}
    />
  );
}
