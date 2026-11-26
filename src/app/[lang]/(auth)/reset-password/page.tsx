import { privatePageMetadata } from "@/lib/page-metadata";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/get-dictionary";
import { peekToken } from "@/lib/auth/tokens";
import { ResetPasswordForm } from "@/components/auth/account-forms";
import { FormAlert } from "@/components/ui/form";

// The token is in the URL: never send it on to other sites ("same-origin",
// not "no-referrer", which makes form posts send Origin: null and fail).
export const generateMetadata = privatePageMetadata((d) => d.accountSecurity.resetTitle, { referrer: "same-origin" });

export default async function ResetPasswordPage({ params, searchParams }: PageProps<"/[lang]/reset-password">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = (await getDictionary(lang)).accountSecurity;
  return (
    <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm sm:p-8">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">{t.resetTitle}</h1>
      <div className="mt-6">
        <Suspense fallback={<div className="h-48" />}>
          <Reset locale={lang} t={t} searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function Reset({ locale, t, searchParams }: { locale: Locale; t: Dictionary["accountSecurity"]; searchParams: PageProps<"/[lang]/reset-password">["searchParams"] }) {
  const sp = await searchParams;
  await connection(); // the link's validity depends on the current time
  const token = typeof sp.token === "string" ? sp.token : "";
  if (!(await peekToken(token, "password_reset"))) {
    return (
      <div className="space-y-4">
        <FormAlert>{t.errors.expired}</FormAlert>
        <Link href={`/${locale}/sign-in/forgot`} className="block text-center font-semibold text-primary hover:underline">{t.forgotSubmit}</Link>
      </div>
    );
  }
  return <ResetPasswordForm locale={locale} token={token} t={t} />;
}
