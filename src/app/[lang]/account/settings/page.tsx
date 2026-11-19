import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { SettingsForm } from "@/components/account/settings-form";
import { PageSkeleton } from "@/components/ui/page-skeleton";

export const metadata: Metadata = { robots: { index: false } };

export default function Page({ params }: PageProps<"/[lang]/account/settings">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/[lang]/account/settings">["params"] }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const [dict, user] = await Promise.all([getDictionary(lang), requireRole(lang, "client", `/${lang}/account/settings`)]);
  const u = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { phone: true, emailReminders: true, smsReminders: true, smsHideBrand: true } });
  return (
    <div className="max-w-xl">
      <h1 className="font-display text-2xl font-semibold text-ink">{dict.account.settingsTitle}</h1>
      <div className="mt-6">
        <SettingsForm locale={lang} t={dict.account} values={{ phone: u.phone ?? "", emailReminders: u.emailReminders, smsReminders: u.smsReminders, smsHideBrand: u.smsHideBrand }} />
      </div>
    </div>
  );
}
