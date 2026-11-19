import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { homePathFor } from "@/domain/roles";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getCurrentUser } from "@/lib/auth/session";
import { safeNextPath } from "@/lib/safe-redirect";
import { SignInForm } from "@/components/auth/sign-in-form";

export async function generateMetadata({ params }: PageProps<"/[lang]/sign-in">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: dict.auth.signInTitle, robots: { index: false } };
}

export default async function SignInPage({ params, searchParams }: PageProps<"/[lang]/sign-in">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm sm:p-8">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">{dict.auth.signInTitle}</h1>
      <p className="mt-1 text-muted">{dict.auth.signInSubtitle}</p>
      <div className="mt-6">
        <Suspense fallback={<div className="h-64" />}>
          <Form locale={lang} searchParams={searchParams} t={dict.auth} />
        </Suspense>
      </div>
      <p className="mt-6 text-center text-sm text-muted">
        {dict.auth.noAccount}{" "}
        <Link href={`/${lang}/sign-up`} className="font-semibold text-primary hover:underline">
          {dict.nav.signUp}
        </Link>
      </p>
    </div>
  );
}

async function Form({
  locale,
  searchParams,
  t,
}: {
  locale: Locale;
  searchParams: PageProps<"/[lang]/sign-in">["searchParams"];
  t: Awaited<ReturnType<typeof getDictionary>>["auth"];
}) {
  const user = await getCurrentUser();
  if (user) redirect(`/${locale}${homePathFor(user.role)}`);
  const { next } = await searchParams;
  const safe = safeNextPath(Array.isArray(next) ? next[0] : next, locale) ?? undefined;
  return <SignInForm locale={locale} next={safe} t={t} />;
}
