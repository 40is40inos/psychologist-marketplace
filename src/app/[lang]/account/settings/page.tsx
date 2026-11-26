import { privatePageMetadata } from "@/lib/page-metadata";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { SettingsForm } from "@/components/account/settings-form";
import { PreferencesForm } from "@/components/account/preferences-form";
import { SESSION_TYPES } from "@/domain/session-types";
import { getTaxonomy } from "@/lib/taxonomy-data";
import { PageSkeleton } from "@/components/ui/page-skeleton";

export const generateMetadata = privatePageMetadata((d) => d.account.tabs.settings);

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
  const [u, taxonomy] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: user.id }, select: { phone: true, emailReminders: true, smsReminders: true, smsHideBrand: true, clientProfile: { select: { preferredLanguage: true, preferredSessionType: true } } } }),
    getTaxonomy(lang),
  ]);
  return (
    <div className="max-w-xl">
      <h1 className="font-display text-2xl font-semibold text-ink">{dict.account.settingsTitle}</h1>
      <div className="mt-6">
        <SettingsForm locale={lang} t={dict.account} values={{ phone: u.phone ?? "", emailReminders: u.emailReminders, smsReminders: u.smsReminders, smsHideBrand: u.smsHideBrand }} />
      </div>
      <section aria-labelledby="prefs" className="mt-10 space-y-3 border-t border-border pt-8">
        <h2 id="prefs" className="text-lg font-semibold text-ink">{dict.clientPrefs.title}</h2>
        <p className="text-sm text-muted">{dict.clientPrefs.hint}</p>
        <PreferencesForm
          locale={lang}
          t={dict.clientPrefs}
          languages={taxonomy.languages.map((l) => ({ value: l.slug, label: l.label }))}
          sessionTypes={SESSION_TYPES.map((s) => ({ value: s, label: dict.sessionTypes[s].label }))}
          values={{ preferredLanguage: u.clientProfile?.preferredLanguage ?? "", preferredSessionType: u.clientProfile?.preferredSessionType ?? "" }}
          saved={dict.workspace.saved}
          saveError={dict.workspace.saveError}
        />
      </section>
    </div>
  );
}
