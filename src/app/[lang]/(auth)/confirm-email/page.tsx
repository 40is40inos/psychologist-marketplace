import { privatePageMetadata } from "@/lib/page-metadata";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { homePathFor } from "@/domain/roles";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/get-dictionary";
import { getCurrentUser } from "@/lib/auth/session";
import { ConfirmEmailForm } from "@/components/auth/account-forms";

export const generateMetadata = privatePageMetadata((d) => d.accountSecurity.confirmTitle, { referrer: "same-origin" });

export default async function ConfirmEmailPage({ params, searchParams }: PageProps<"/[lang]/confirm-email">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = (await getDictionary(lang)).accountSecurity;
  return (
    <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm sm:p-8">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">{t.confirmTitle}</h1>
      <p className="mt-1 text-muted">{t.confirmIntro}</p>
      <div className="mt-6">
        <Suspense fallback={<div className="h-12" />}>
          <Confirm locale={lang} t={t} searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function Confirm({ locale, t, searchParams }: { locale: Locale; t: Dictionary["accountSecurity"]; searchParams: PageProps<"/[lang]/confirm-email">["searchParams"] }) {
  const [sp, user] = await Promise.all([searchParams, getCurrentUser()]);
  const token = typeof sp.token === "string" ? sp.token : "";
  const homeHref = user ? `/${locale}${homePathFor(user.role)}` : `/${locale}/sign-in`;
  return <ConfirmEmailForm locale={locale} token={token} homeHref={homeHref} t={t} />;
}
