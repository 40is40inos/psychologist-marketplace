import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { homePathFor } from "@/domain/roles";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/get-dictionary";
import { getCurrentUser } from "@/lib/auth/session";
import { SignUpForm } from "@/components/auth/sign-up-form";

export async function generateMetadata({ params }: PageProps<"/[lang]/sign-up">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: dict.auth.signUpTitle };
}

export default async function SignUpPage({ params, searchParams }: PageProps<"/[lang]/sign-up">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm sm:p-8">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">{dict.auth.signUpTitle}</h1>
      <p className="mt-1 text-muted">{dict.auth.signUpSubtitle}</p>
      <div className="mt-6">
        <Suspense fallback={<div className="h-[560px]" />}>
          <Form locale={lang} searchParams={searchParams} dict={dict} />
        </Suspense>
      </div>
      <p className="mt-6 text-center text-sm text-muted">
        {dict.auth.haveAccount}{" "}
        <Link href={`/${lang}/sign-in`} className="font-semibold text-primary hover:underline">
          {dict.nav.signIn}
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
  searchParams: PageProps<"/[lang]/sign-up">["searchParams"];
  dict: Dictionary;
}) {
  const user = await getCurrentUser();
  if (user) redirect(`/${locale}${homePathFor(user.role)}`);
  const { role } = await searchParams;
  return (
    <SignUpForm
      locale={locale}
      initialRole={role === "psychologist" ? "psychologist" : "client"}
      t={dict.auth}
      titles={dict.titles}
    />
  );
}
