import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Clock, LifeBuoy, Mail } from "lucide-react";
import { brand } from "@/config/brand";
import { isLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { ContactForm } from "@/components/contact-form";

export async function generateMetadata({ params }: PageProps<"/[lang]/contact">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = (await getDictionary(lang)).contactPage;
  return {
    title: t.metaTitle,
    description: t.metaDescription,
    alternates: { canonical: `/${lang}/contact`, languages: Object.fromEntries(locales.map((l) => [l, `/${l}/contact`])) },
  };
}

export default async function ContactPage({ params }: PageProps<"/[lang]/contact">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const t = dict.contactPage;

  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-6">
        <header className="space-y-3">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{t.title}</h1>
          <p className="text-lg leading-relaxed text-muted">{t.intro}</p>
        </header>
        <div className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
          <ContactForm t={t} />
        </div>
      </div>

      <aside className="space-y-4">
        <div className="space-y-3 rounded-3xl border border-border bg-surface p-5">
          <p className="flex items-start gap-2 text-ink">
            <Mail className="mt-1 size-4 shrink-0 text-primary" aria-hidden="true" />
            <span>
              <span className="block text-sm text-muted">{t.emailLabel}</span>
              <a href={`mailto:${brand.supportEmail}`} className="font-medium text-primary underline underline-offset-2">{brand.supportEmail}</a>
            </span>
          </p>
          <p className="flex items-start gap-2 text-sm text-muted">
            <Clock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            {t.hours}
          </p>
        </div>
        <div className="rounded-3xl border border-accent/30 bg-accent-soft/60 p-5">
          <p className="flex items-start gap-2 text-sm text-ink">
            <LifeBuoy className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
            <span>
              {t.notCrisis}{" "}
              <Link href={`/${lang}/urgent-help`} className="font-semibold underline underline-offset-2">{dict.urgentHelp.link}</Link>
            </span>
          </p>
        </div>
        <p className="text-sm text-muted">
          <Link href={`/${lang}/faq`} className="font-medium text-primary underline underline-offset-2">{dict.footerX.faq}</Link>
        </p>
      </aside>
    </div>
  );
}
