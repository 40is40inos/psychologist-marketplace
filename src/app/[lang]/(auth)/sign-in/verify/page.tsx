import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/get-dictionary";
import { safeNextPath } from "@/lib/safe-redirect";
import { VerifyForm } from "@/components/security/two-factor-forms";

export const metadata: Metadata = { robots: { index: false } };

export default async function VerifyPage({ params, searchParams }: PageProps<"/[lang]/sign-in/verify">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm sm:p-8">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">{dict.twoFactor.verifyTitle}</h1>
      <p className="mt-1 text-muted">{dict.twoFactor.verifyIntro}</p>
      <div className="mt-6">
        <Suspense fallback={<div className="h-40" />}>
          <Form locale={lang} dict={dict} searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function Form({ locale, dict, searchParams }: { locale: Locale; dict: Dictionary; searchParams: PageProps<"/[lang]/sign-in/verify">["searchParams"] }) {
  const { next } = await searchParams;
  const safe = safeNextPath(Array.isArray(next) ? next[0] : next, locale) ?? undefined;
  return <VerifyForm locale={locale} next={safe} t={dict.twoFactor} />;
}
