import Link from "next/link";
import { ArrowRight, BadgeCheck, Lock, ReceiptEuro } from "lucide-react";
import { notFound } from "next/navigation";
import { brand } from "@/config/brand";
import { SESSION_TYPES } from "@/domain/session-types";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/get-dictionary";
import { demoTherapists, lowestPrice, type ConcernKey } from "@/data/demo-therapists";
import { fill, formatPrice } from "@/lib/format";
import { SearchForm } from "@/components/search-form";
import { SessionTypeIcon } from "@/components/session-type-icon";
import { TherapistCard } from "@/components/therapist-card";

const trustIcons = [BadgeCheck, Lock, ReceiptEuro];

export default async function HomePage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const concerns = Object.keys(dict.concerns) as ConcernKey[];

  return (
    <>
      {/* Hero + search */}
      <section className="border-b border-border bg-gradient-to-b from-primary-soft/60 to-bg">
        <div className="mx-auto max-w-6xl px-4 pb-14 pt-12 sm:px-6 sm:pt-16 lg:pb-20">
          <p className="text-sm font-semibold text-primary">{dict.home.eyebrow}</p>
          <h1 className="mt-3 max-w-3xl font-display text-[2.1rem] font-semibold leading-[1.12] tracking-tight text-ink text-balance sm:text-5xl">
            {dict.home.heroTitle}
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted text-pretty">
            {dict.home.heroSubtitle}
          </p>

          <div className="mt-8">
            <SearchForm locale={lang} dict={dict} />
          </div>

          <div className="mt-6">
            <h2 className="text-sm font-medium text-muted">{dict.home.concernsTitle}</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {concerns.map((key) => (
                <li key={key}>
                  <Link
                    href={`/${lang}/psychologists?concern=${encodeURIComponent(dict.concerns[key])}`}
                    className="inline-flex min-h-10 items-center rounded-full border border-border bg-surface px-4 text-sm font-medium text-ink transition-colors hover:border-primary hover:text-primary"
                  >
                    {dict.concerns[key]}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Session types */}
      <Section title={dict.home.sessionTypesTitle} subtitle={dict.home.sessionTypesSubtitle}>
        <ul className="grid gap-4 sm:grid-cols-3">
          {SESSION_TYPES.map((type) => {
            const from = lowestPrice(type);
            return (
              <li key={type}>
                <Link
                  href={`/${lang}/psychologists?type=${type}`}
                  className="group flex h-full flex-col rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-primary"
                >
                  <span className="grid size-12 place-items-center rounded-xl bg-primary-soft text-primary">
                    <SessionTypeIcon type={type} className="size-6" />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-ink">{dict.sessionTypes[type].label}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{dict.sessionTypes[type].description}</p>
                  <p className="mt-auto flex items-center justify-between pt-5 text-sm">
                    {from !== null && (
                      <span className="font-semibold text-ink">
                        {fill(dict.price.from, { price: formatPrice(from, lang) })}{" "}
                        <span className="font-normal text-muted">{dict.price.perSession}</span>
                      </span>
                    )}
                    <ArrowRight className="size-4 text-primary transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </Section>

      {/* Featured */}
      <Section title={dict.home.featuredTitle} muted>
        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {demoTherapists.slice(0, 3).map((t) => (
            <li key={t.slug}>
              <TherapistCard therapist={t} locale={lang} dict={dict} />
            </li>
          ))}
        </ul>
        <div className="mt-8">
          <Link
            href={`/${lang}/psychologists`}
            className="inline-flex h-12 items-center gap-2 rounded-xl border border-border bg-surface px-5 font-semibold text-ink transition-colors hover:border-primary hover:text-primary"
          >
            {dict.home.featuredCta}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </Section>

      {/* How it works */}
      <Section id="how-it-works" title={dict.home.howTitle}>
        <ol className="grid gap-6 sm:grid-cols-3">
          {dict.home.howSteps.map((step, i) => (
            <li key={step.title} className="flex gap-4 sm:flex-col">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary font-semibold text-primary-ink">
                {i + 1}
              </span>
              <div>
                <h3 className="font-semibold text-ink">{step.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      {/* Trust */}
      <Section title={dict.home.trustTitle} muted>
        <ul className="grid gap-4 sm:grid-cols-3">
          {dict.home.trustItems.map((item, i) => {
            const Icon = trustIcons[i] ?? BadgeCheck;
            return (
              <li key={item.title} className="rounded-2xl border border-border bg-surface p-6">
                <Icon className="size-6 text-primary" aria-hidden="true" />
                <h3 className="mt-3 font-semibold text-ink">{item.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{item.body}</p>
              </li>
            );
          })}
        </ul>
      </Section>

      <ForPsychologists lang={lang} dict={dict} />
    </>
  );
}

function Section({
  id,
  title,
  subtitle,
  muted,
  children,
}: {
  id?: string;
  title: string;
  subtitle?: string;
  muted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={`scroll-mt-20 ${muted ? "bg-surface-muted/60" : ""}`}>
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl text-balance">{title}</h2>
        {subtitle && <p className="mt-2 max-w-2xl text-muted">{subtitle}</p>}
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}

function ForPsychologists({ lang, dict }: { lang: Locale; dict: Dictionary }) {
  return (
    <section id="for-psychologists" className="scroll-mt-20">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
        <div className="rounded-3xl bg-primary px-6 py-10 text-primary-ink sm:px-10 sm:py-12">
          <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{dict.home.ctaTitle}</h2>
          <p className="mt-3 max-w-xl opacity-90">{dict.home.ctaBody}</p>
          <Link
            href={`/${lang}/sign-up?role=psychologist`}
            className="mt-6 inline-flex h-12 items-center rounded-xl bg-primary-ink px-5 font-semibold text-primary transition-opacity hover:opacity-90"
          >
            {fill(dict.home.ctaButton, { brand: brand.name })}
          </Link>
        </div>
      </div>
    </section>
  );
}
