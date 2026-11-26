import { privatePageMetadata } from "@/lib/page-metadata";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { savePlan } from "@/actions/plans";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/get-dictionary";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { fill } from "@/lib/format";
import { PLAN_FEATURES } from "@/lib/plans";
import { ActionForm } from "@/components/ui/action-form";
import { inputClass } from "@/components/ui/form";
import { PageSkeleton } from "@/components/ui/page-skeleton";

export const generateMetadata = privatePageMetadata((d) => d.adminPlans.title);

export default async function AdminPlansPage({ params }: PageProps<"/[lang]/admin/plans">) {
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
  await requireRole(locale, "admin", `/${locale}/admin/plans`);
  const t = dict.adminPlans;
  const plans = await db.plan.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { psychologists: true } } } });
  const forms = [...plans, null];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">{t.title}</h1>
        <p className="mt-1 text-sm text-muted">{t.hint}</p>
      </div>
      <ul className="grid gap-4 lg:grid-cols-2">
        {forms.map((p) => {
          const name = (p?.name ?? {}) as Record<string, string>;
          const key = p?.id ?? "new";
          return (
            <li key={key} className="rounded-2xl border border-border bg-surface p-5">
              <h2 className="mb-4 font-semibold text-ink">
                {p ? (name[locale] ?? p.slug) : t.add}
                {p && <span className="ml-2 text-sm font-normal text-muted">{fill(t.psychologists, { count: p._count.psychologists })}</span>}
              </h2>
              <ActionForm action={savePlan} submitLabel={t.save} savedLabel={dict.workspace.saved} errors={{ invalid: dict.workspace.saveError }}>
                {p && <input type="hidden" name="id" value={p.id} />}
                <div className="grid gap-3 sm:grid-cols-2">
                  <Labeled label={t.slug}><input name="slug" defaultValue={p?.slug} required className={inputClass} /></Labeled>
                  <Labeled label="#"><input name="sortOrder" type="number" min={0} defaultValue={p?.sortOrder ?? forms.length} className={inputClass} /></Labeled>
                  <Labeled label={fill(t.name, { language: dict.languages.el })}><input name="name_el" defaultValue={name.el} required className={inputClass} /></Labeled>
                  <Labeled label={fill(t.name, { language: dict.languages.en })}><input name="name_en" defaultValue={name.en} required className={inputClass} /></Labeled>
                  <Labeled label={t.price}><input name="price" type="number" min={0} step="0.01" defaultValue={p ? p.monthlyPriceCents / 100 : 0} className={inputClass} /></Labeled>
                  <Labeled label={t.commission}><input name="commission" type="number" min={0} max={50} step="0.1" defaultValue={p ? p.commissionBps / 100 : 0} className={inputClass} /></Labeled>
                </div>
                <fieldset>
                  <legend className="mb-2 text-xs font-medium text-muted">{t.features}</legend>
                  <div className="flex flex-wrap gap-2">
                    {PLAN_FEATURES.map((f) => (
                      <label key={f} className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-border px-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary-soft/60">
                        <input type="checkbox" name="features" value={f} defaultChecked={p?.features.includes(f)} className="size-4 accent-[var(--primary)]" />
                        {dict.planPage.features[f]}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="flex flex-wrap gap-4 text-sm text-ink">
                  <label className="flex items-center gap-2"><input type="checkbox" name="active" defaultChecked={p?.active ?? true} className="size-4 accent-[var(--primary)]" />{t.active}</label>
                  <label className="flex items-center gap-2"><input type="checkbox" name="isDefault" defaultChecked={p?.isDefault} className="size-4 accent-[var(--primary)]" />{t.default}</label>
                </div>
              </ActionForm>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}
