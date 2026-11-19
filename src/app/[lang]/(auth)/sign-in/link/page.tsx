import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/get-dictionary";
import { safeNextPath } from "@/lib/safe-redirect";
import { MagicLinkConfirm } from "@/components/auth/magic-link-forms";

export const metadata: Metadata = { robots: { index: false }, referrer: "no-referrer" };

export default async function MagicLinkPage({ params, searchParams }: PageProps<"/[lang]/sign-in/link">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm sm:p-8">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">{dict.magicLink.confirmTitle}</h1>
      <p className="mt-1 text-muted">{dict.magicLink.confirmBody}</p>
      <div className="mt-6">
        <Suspense fallback={<div className="h-12" />}>
          <Confirm locale={lang} t={dict.magicLink} searchParams={searchParams} />
        </Suspense>
      </div>
      <p className="mt-6 text-center text-sm text-muted">
        <Link href={`/${lang}/sign-in`} className="font-semibold text-primary hover:underline">{dict.magicLink.back}</Link>
      </p>
    </div>
  );
}

async function Confirm({ locale, t, searchParams }: { locale: Locale; t: Dictionary["magicLink"]; searchParams: PageProps<"/[lang]/sign-in/link">["searchParams"] }) {
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";
  const next = safeNextPath(typeof sp.next === "string" ? sp.next : null, locale) ?? undefined;
  return <MagicLinkConfirm locale={locale} token={token} next={next} t={t} />;
}
