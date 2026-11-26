import { privatePageMetadata } from "@/lib/page-metadata";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { requireRole } from "@/lib/auth/session";
import { PrivacyCenter } from "@/components/privacy/privacy-center";
import { PageSkeleton } from "@/components/ui/page-skeleton";

export const generateMetadata = privatePageMetadata((d) => d.privacyCenter.title);

export default function Page({ params }: PageProps<"/[lang]/account/privacy">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/[lang]/account/privacy">["params"] }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const [dict, user] = await Promise.all([getDictionary(lang), requireRole(lang, "client", `/${lang}/account/privacy`)]);
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">{dict.privacyCenter.title}</h1>
        <p className="mt-1 text-muted">{dict.privacyCenter.intro}</p>
      </div>
      <PrivacyCenter user={user} locale={lang} dict={dict} />
    </div>
  );
}
