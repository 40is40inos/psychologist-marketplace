import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { ShieldCheck } from "lucide-react";
import { disableTwoFactor } from "@/actions/two-factor";
import { signOutOtherDevices } from "@/actions/account-security";
import { ChangeEmailForm, ChangePasswordForm, ResendVerificationForm } from "@/components/auth/account-forms";
import { brand } from "@/config/brand";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/get-dictionary";
import { otherSessionCount, requireUser } from "@/lib/auth/session";
import { isDemoAccount } from "@/config/demo";
import { generateSecret, otpauthUri } from "@/lib/auth/totp";
import { twoFactorRequired } from "@/lib/auth/two-factor";
import { decrypt, encrypt } from "@/lib/crypto";
import { db } from "@/lib/db";
import { fill, formatShortDate } from "@/lib/format";
import { EnableForm, RegenerateForm } from "@/components/security/two-factor-forms";
import { FormAlert } from "@/components/ui/form";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { PrivacyCenter } from "@/components/privacy/privacy-center";
import { SubmitButton } from "@/components/ui/submit-button";

export const metadata: Metadata = { robots: { index: false } };

export default async function SecurityPage({ params, searchParams }: PageProps<"/[lang]/security">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <Suspense fallback={<PageSkeleton />}>
        <Security locale={lang} dict={dict} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Security({ locale, dict, searchParams }: { locale: Locale; dict: Dictionary; searchParams: PageProps<"/[lang]/security">["searchParams"] }) {
  const me = await requireUser(locale, `/${locale}/security`);
  if (isDemoAccount(me.email)) {
    return (
      <div className="space-y-6">
        <h1 className="flex items-center gap-2 font-display text-3xl font-semibold tracking-tight text-ink">
          <ShieldCheck className="size-7 text-primary" aria-hidden="true" />
          {dict.accountSecurity.pageTitle}
        </h1>
        <FormAlert tone="success">{dict.accountSecurity.demoLocked}</FormAlert>
        {me.role !== "client" && <PrivacyCenter user={me} locale={locale} dict={dict} />}
      </div>
    );
  }
  const t = dict.twoFactor;
  const sp = await searchParams;
  const s = dict.accountSecurity;
  const [user, otherDevices] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: me.id }, select: { email: true, emailVerifiedAt: true, passwordHash: true, totpSecretEncrypted: true, totpEnabledAt: true } }),
    otherSessionCount(me.id),
  ]);
  const hasPassword = user.passwordHash !== "!";
  const section = "space-y-4 rounded-2xl border border-border bg-surface p-5";

  let setup: { qr: string; secret: string } | null = null;
  if (!user.totpEnabledAt) {
    // A fresh secret is stored (not yet active) until the first code confirms it.
    let secret = user.totpSecretEncrypted ? decrypt(user.totpSecretEncrypted) : null;
    if (!secret) {
      secret = generateSecret();
      await db.user.update({ where: { id: me.id }, data: { totpSecretEncrypted: encrypt(secret) } });
    }
    const qr = await QRCode.toDataURL(otpauthUri(secret, user.email, brand.name), { margin: 1, width: 220 });
    setup = { qr, secret };
  }

  return (
    <div className="space-y-6">
      <h1 className="flex items-center gap-2 font-display text-3xl font-semibold tracking-tight text-ink">
        <ShieldCheck className="size-7 text-primary" aria-hidden="true" />
        {s.pageTitle}
      </h1>
      {sp.required && !user.totpEnabledAt && <FormAlert>{t.required}</FormAlert>}

      <section aria-labelledby="email-h" className={section}>
        <h2 id="email-h" className="font-semibold text-ink">{s.emailTitle}</h2>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-ink">
          <span className="break-all font-medium">{user.email}</span>
          {user.emailVerifiedAt ? (
            <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary">{s.verified}</span>
          ) : (
            <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">{s.unverified}</span>
          )}
        </p>
        {!user.emailVerifiedAt && (
          <p className="text-sm text-muted">{s.verifyHint} <ResendVerificationForm locale={locale} t={s} /></p>
        )}
        <details className="group">
          <summary className="cursor-pointer text-sm font-semibold text-primary">{s.changeEmail}</summary>
          <div className="mt-4 space-y-3">
            <p className="text-sm text-muted">{s.changeEmailHint}</p>
            <ChangeEmailForm locale={locale} hasPassword={hasPassword} t={s} />
          </div>
        </details>
      </section>

      <section aria-labelledby="password-h" className={section}>
        <h2 id="password-h" className="font-semibold text-ink">{s.passwordTitle}</h2>
        <p className="text-sm text-muted">{hasPassword ? s.passwordIntro : s.noPasswordIntro}</p>
        <ChangePasswordForm locale={locale} hasPassword={hasPassword} t={s} />
      </section>

      <h2 className="pt-2 font-display text-2xl font-semibold text-ink">{t.title}</h2>
      <p className="text-ink">{t.intro}</p>

      {setup ? (
        <div className="space-y-5 rounded-2xl border border-border bg-surface p-5">
          <div>
            <h2 className="font-semibold text-ink">{t.step1}</h2>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={setup.qr} alt={t.step1} width={220} height={220} className="mt-3 rounded-lg border border-border bg-white p-2" />
            <p className="mt-3 text-sm text-muted">{t.manual}</p>
            <p className="mt-1 break-all font-mono text-sm text-ink">{setup.secret.match(/.{1,4}/g)?.join(" ")}</p>
          </div>
          <EnableForm locale={locale} t={t} />
        </div>
      ) : (
        <div className="space-y-5 rounded-2xl border border-primary/30 bg-surface p-5">
          <p className="flex items-center gap-2 font-semibold text-primary">
            <ShieldCheck className="size-5" aria-hidden="true" />
            {t.enabled} {user.totpEnabledAt && fill(t.enabledSince, { date: formatShortDate(user.totpEnabledAt, locale) })}
          </p>
          <RegenerateForm locale={locale} t={t} />
          {twoFactorRequired(me.role) ? (
            <p className="text-sm text-muted">{t.disableHint}</p>
          ) : (
            <form action={disableTwoFactor}>
              <input type="hidden" name="locale" value={locale} />
              <SubmitButton variant="danger">{t.disable}</SubmitButton>
            </form>
          )}
        </div>
      )}

      <section aria-labelledby="devices-h" className={section}>
        <h2 id="devices-h" className="font-semibold text-ink">{s.devicesTitle}</h2>
        <p className="text-sm text-muted">{otherDevices === 0 ? s.devicesNone : fill(s.devicesOther, { count: otherDevices })}</p>
        {otherDevices > 0 && (
          <form action={signOutOtherDevices}>
            <input type="hidden" name="locale" value={locale} />
            <SubmitButton variant="secondary">{s.signOutOthers}</SubmitButton>
          </form>
        )}
      </section>

      {me.role !== "client" && (
        <section className="space-y-4 border-t border-border pt-8">
          <h2 className="font-display text-2xl font-semibold text-ink">{dict.privacyCenter.title}</h2>
          <PrivacyCenter user={me} locale={locale} dict={dict} />
        </section>
      )}
    </div>
  );
}
