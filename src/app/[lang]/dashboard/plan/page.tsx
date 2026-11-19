import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { choosePlan } from "@/actions/plans";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/get-dictionary";
import { fill, formatPrice } from "@/lib/format";
import { listPlans, planFor, PLAN_FEATURES } from "@/lib/plans";
import { requirePsychologist } from "@/lib/workspace";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { SubmitButton } from "@/components/ui/submit-button";

export const metadata: Metadata = { robots: { index: false } };

export default async function PlanPage({ params }: PageProps<"/[lang]/dashboard/plan">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Plans locale={lang} dict={dict} />
    </Suspense>
  );
}

async function Plans({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const { profileId } = await requirePsychologist(locale, `/${locale}/dashboard/plan`);
  const t = dict.planPage;
  const [plans, current] = await Promise.all([listPlans(locale), planFor(profileId, locale)]);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold text-ink">{t.title}</h1>
      <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((p) => {
          const isCurrent = current?.id === p.id;
          return (
            <li key={p.id} className={`flex flex-col rounded-2xl border p-6 ${isCurrent ? "border-primary bg-primary-soft/40" : "border-border bg-surface"}`}>
              <h2 className="text-lg font-semibold text-ink">{p.name}</h2>
              <p className="mt-2">
                <span className="font-display text-3xl font-semibold text-ink">{p.monthlyPriceCents === 0 ? t.free : formatPrice(p.monthlyPriceCents, locale)}</span>
                {p.monthlyPriceCents > 0 && <span className="text-muted"> {t.perMonth}</span>}
              </p>
              <p className="mt-1 text-sm font-medium text-ink">
                {p.commissionBps > 0 ? fill(t.commission, { percent: (p.commissionBps / 100).toLocaleString(locale) }) : t.noCommission}
              </p>
              <ul className="mt-5 space-y-2 text-sm">
                <li className="flex gap-2 text-ink"><Check className="size-4 shrink-0 text-primary" aria-hidden="true" />{t.features.listing}</li>
                {PLAN_FEATURES.map((f) => (
                  <li key={f} className={`flex gap-2 ${p.features.includes(f) ? "text-ink" : "text-muted line-through"}`}>
                    <Check className={`size-4 shrink-0 ${p.features.includes(f) ? "text-primary" : "opacity-30"}`} aria-hidden="true" />
                    {t.features[f]}
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-6">
                {isCurrent ? (
                  <p className="inline-flex h-11 items-center font-semibold text-primary">{t.chosen}</p>
                ) : (
                  <form action={choosePlan}>
                    <input type="hidden" name="planId" value={p.id} />
                    <SubmitButton variant="secondary">{t.choose}</SubmitButton>
                  </form>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-sm text-muted">{t.billingNote}</p>
    </div>
  );
}
