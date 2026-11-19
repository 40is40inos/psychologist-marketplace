import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight, BadgeCheck, CalendarCheck, Check, Lock, ReceiptText, Search, Video, Wallet } from "lucide-react";
import { brand } from "@/config/brand";
import { isLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { fill, formatPrice } from "@/lib/format";
import { getPublicPlans } from "@/lib/plans";
import { buttonClass } from "@/components/ui/form";
import { FaqList, faqJsonLd, JsonLd } from "@/components/faq-list";

export async function generateMetadata({ params }: PageProps<"/[lang]/for-psychologists">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = (await getDictionary(lang)).forPros;
  return {
    title: t.metaTitle,
    description: t.metaDescription,
    alternates: { canonical: `/${lang}/for-psychologists`, languages: Object.fromEntries(locales.map((l) => [l, `/${l}/for-psychologists`])) },
  };
}

const benefitIcons = [Search, CalendarCheck, Video, Wallet, ReceiptText, Lock];

export default async function ForPsychologistsPage({ params }: PageProps<"/[lang]/for-psychologists">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const t = dict.forPros;
  const plans = await getPublicPlans(lang);
  const signUp = `/${lang}/sign-up?role=psychologist`;
  const popularIndex = plans.length >= 3 ? 1 : -1;

  return (
    <>
      <JsonLd data={faqJsonLd(t.faq)} />

      <section className="border-b border-border bg-gradient-to-b from-primary-soft/60 to-bg">
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-12 sm:px-6 sm:pt-16">
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
            <BadgeCheck className="size-4" aria-hidden="true" />
            {t.eyebrow}
          </p>
          <h1 className="mt-3 max-w-3xl font-display text-[2.1rem] font-semibold leading-[1.12] tracking-tight text-ink text-balance sm:text-5xl">{t.title}</h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted text-pretty">{t.subtitle}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={signUp} className={buttonClass.primary}>
              {t.cta}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <a href="#plans" className={buttonClass.secondary}>{t.ctaSecondary}</a>
          </div>
        </div>
      </section>

      <Section title={t.benefitsTitle}>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {t.benefits.map((b, i) => {
            const Icon = benefitIcons[i] ?? Check;
            return (
              <li key={b.title} className="rounded-3xl border border-border bg-surface p-6">
                <span className="grid size-11 place-items-center rounded-2xl bg-primary-soft text-primary">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-semibold text-ink">{b.title}</h3>
                <p className="mt-1 leading-relaxed text-muted">{b.body}</p>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title={t.stepsTitle} muted>
        <ol className="grid gap-6 sm:grid-cols-3">
          {t.steps.map((s, i) => (
            <li key={s.title} className="flex gap-4 sm:flex-col">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary font-semibold text-primary-ink">{i + 1}</span>
              <div>
                <h3 className="font-semibold text-ink">{s.title}</h3>
                <p className="mt-1 leading-relaxed text-muted">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="plans" title={t.plansTitle} subtitle={t.plansSubtitle}>
        <ul className="grid gap-4 md:grid-cols-3">
          {plans.map((p, i) => {
            const popular = i === popularIndex;
            return (
              <li key={p.id} className={`relative flex flex-col rounded-3xl border bg-surface p-6 ${popular ? "border-primary shadow-[0_8px_30px_-12px_rgb(31_42_38/0.25)]" : "border-border"}`}>
                {popular && (
                  <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-ink">{t.popular}</span>
                )}
                <h3 className="text-lg font-semibold text-ink">{p.name}</h3>
                <p className="mt-2">
                  <span className="text-3xl font-semibold tabular-nums text-ink">
                    {p.monthlyPriceCents === 0 ? dict.planPage.free : formatPrice(p.monthlyPriceCents, lang)}
                  </span>
                  {p.monthlyPriceCents > 0 && <span className="text-muted"> {dict.planPage.perMonth}</span>}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {p.commissionBps > 0 ? fill(dict.planPage.commission, { percent: p.commissionBps / 100 }) : dict.planPage.noCommission}
                </p>
                <ul className="mb-6 mt-5 space-y-2">
                  <li className="flex gap-2 text-ink"><Check className="mt-1 size-4 shrink-0 text-primary" aria-hidden="true" />{dict.planPage.features.listing}</li>
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2 text-ink"><Check className="mt-1 size-4 shrink-0 text-primary" aria-hidden="true" />{dict.planPage.features[f]}</li>
                  ))}
                </ul>
                <Link href={signUp} className={`mt-auto ${popular ? buttonClass.primary : buttonClass.secondary}`}>
                  {fill(t.planCta, { plan: p.name })}
                </Link>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-sm text-muted">{dict.planPage.billingNote}</p>
      </Section>

      <Section title={t.faqTitle} muted>
        <div className="max-w-3xl">
          <FaqList items={t.faq} />
        </div>
      </Section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
        <div className="rounded-3xl bg-primary px-6 py-10 text-primary-ink sm:px-10 sm:py-12">
          <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{t.finalTitle}</h2>
          <p className="mt-3 max-w-xl opacity-90">{t.finalBody}</p>
          <Link href={signUp} className="mt-6 inline-flex h-12 items-center rounded-xl bg-primary-ink px-5 font-semibold text-primary transition-opacity hover:opacity-90">
            {fill(dict.home.ctaButton, { brand: brand.name })}
          </Link>
        </div>
      </section>
    </>
  );
}

function Section({ id, title, subtitle, muted, children }: { id?: string; title: string; subtitle?: string; muted?: boolean; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-title` : undefined} className={`scroll-mt-20 ${muted ? "bg-surface-muted/60" : ""}`}>
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
        <h2 id={id ? `${id}-title` : undefined} className="font-display text-2xl font-semibold tracking-tight text-ink text-balance sm:text-3xl">{title}</h2>
        {subtitle && <p className="mt-2 max-w-2xl text-muted">{subtitle}</p>}
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}
