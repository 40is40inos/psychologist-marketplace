import { privatePageMetadata } from "@/lib/page-metadata";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { ForgotPasswordForm } from "@/components/auth/account-forms";

export const generateMetadata = privatePageMetadata((d) => d.accountSecurity.forgotTitle);

export default async function ForgotPasswordPage({ params }: PageProps<"/[lang]/sign-in/forgot">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = (await getDictionary(lang)).accountSecurity;
  return (
    <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm sm:p-8">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">{t.forgotTitle}</h1>
      <p className="mt-1 text-muted">{t.forgotIntro}</p>
      <div className="mt-6">
        <ForgotPasswordForm locale={lang} t={t} />
      </div>
      <p className="mt-6 text-center text-sm text-muted">
        <Link href={`/${lang}/sign-in`} className="font-semibold text-primary hover:underline">{t.backToSignIn}</Link>
      </p>
    </div>
  );
}
