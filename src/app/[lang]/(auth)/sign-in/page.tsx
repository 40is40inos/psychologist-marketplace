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
import { GoogleSignIn } from "@/components/auth/google-button";
import { MagicLinkRequest } from "@/components/auth/magic-link-forms";
import { FormAlert } from "@/components/ui/form";
import { googleEnabled } from "@/lib/auth/google";
import type { Dictionary } from "@/i18n/get-dictionary";

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
          <Form locale={lang} searchParams={searchParams} dict={dict} />
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
  dict,
}: {
  locale: Locale;
  searchParams: PageProps<"/[lang]/sign-in">["searchParams"];
  dict: Dictionary;
}) {
  const user = await getCurrentUser();
  if (user) redirect(`/${locale}${homePathFor(user.role)}`);
  const { next, google } = await searchParams;
  const safe = safeNextPath(Array.isArray(next) ? next[0] : next, locale) ?? undefined;
  const g = dict.googleAuth;
  const googleError = typeof google === "string" && google in g.errors ? g.errors[google as keyof typeof g.errors] : null;
  return (
    <div className="space-y-6">
      {googleError && <FormAlert>{googleError}</FormAlert>}
      {googleEnabled() && <GoogleSignIn locale={locale} next={safe} label={g.continue} />}
      {googleEnabled() && <p className="flex items-center gap-3 text-sm text-muted before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">{g.or}</p>}
      <SignInForm locale={locale} next={safe} t={dict.auth} />
      <details className="group rounded-2xl border border-border p-4">
        <summary className="cursor-pointer text-sm font-semibold text-primary">{dict.magicLink.toggle}</summary>
        <div className="mt-4"><MagicLinkRequest locale={locale} next={safe} t={dict.magicLink} /></div>
      </details>
    </div>
  );
}
