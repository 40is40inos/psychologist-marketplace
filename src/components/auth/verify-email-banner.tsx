import { Suspense } from "react";
import { MailWarning } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { ResendVerificationForm } from "@/components/auth/account-forms";

/** Reminder for accounts whose email address isn't confirmed yet. */
export function VerifyEmailBanner(props: { locale: Locale; t: Dictionary["accountSecurity"] }) {
  return (
    <Suspense fallback={null}>
      <Banner {...props} />
    </Suspense>
  );
}

async function Banner({ locale, t }: { locale: Locale; t: Dictionary["accountSecurity"] }) {
  const me = await getCurrentUser();
  if (!me) return null;
  const user = await db.user.findUnique({ where: { id: me.id }, select: { emailVerifiedAt: true } });
  if (!user || user.emailVerifiedAt) return null;
  return (
    <div role="status" className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-ink">
      <MailWarning className="size-4 shrink-0 text-accent" aria-hidden="true" />
      <span>{t.verifyBanner}</span>
      <ResendVerificationForm locale={locale} t={t} />
    </div>
  );
}
