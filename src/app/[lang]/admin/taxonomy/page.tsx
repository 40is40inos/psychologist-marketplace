import { privatePageMetadata } from "@/lib/page-metadata";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { saveLanguage, saveSpecialty } from "@/actions/admin-x";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/get-dictionary";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { fill } from "@/lib/format";
import { ActionForm } from "@/components/ui/action-form";
import { inputClass } from "@/components/ui/form";
import { PageSkeleton } from "@/components/ui/page-skeleton";

export const generateMetadata = privatePageMetadata((d) => d.adminX.taxonomy.title);

export default async function AdminTaxonomyPage({ params }: PageProps<"/[lang]/admin/taxonomy">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Taxonomy locale={lang} dict={dict} />
    </Suspense>
  );
}

const cell = `${inputClass} h-10`;

async function Taxonomy({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  await requireRole(locale, "admin", `/${locale}/admin/taxonomy`);
  const t = dict.adminX.taxonomy;
  const [specialties, languages, langUse] = await Promise.all([
    db.specialty.findMany({ orderBy: [{ sortOrder: "asc" }, { slug: "asc" }], include: { _count: { select: { psychologists: true } } } }),
    db.language.findMany({ orderBy: [{ sortOrder: "asc" }, { code: "asc" }] }),
    db.psychologistProfile.findMany({ select: { sessionLanguages: true } }),
  ]);
  const langCount = (code: string) => langUse.filter((p) => p.sessionLanguages.includes(code)).length;
  const errors = { invalid: dict.workspace.saveError };
  const sections = [
    ["concern", t.concerns],
    ["approach", t.approaches],
    ["client_type", t.clientTypes],
  ] as const;


  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">{t.title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted">{t.hint}</p>
      </div>

      {sections.map(([kind, title]) => {
        const items = specialties.filter((s) => s.kind === kind);
        return (
          <section key={kind} aria-labelledby={`tx-${kind}`} className="space-y-2">
            <h2 id={`tx-${kind}`} className="text-lg font-semibold text-ink">{title}</h2>
            <Header t={t} />
            <ul className="space-y-2">
              {items.map((s) => {
                const labels = (s.labels ?? {}) as Record<string, string>;
                return (
                  <li key={s.id} className="rounded-xl border border-border bg-surface p-3">
                    <ActionForm action={saveSpecialty} submitLabel={t.save} savedLabel="✓" errors={errors} variant="secondary" className="grid items-center gap-2 sm:grid-cols-[9rem_1fr_1fr_4.5rem_5rem_auto]">
                      <input type="hidden" name="id" value={s.id} />
                      <span className="font-mono text-xs text-ink">{s.slug}<span className="block font-sans text-muted">{fill(t.used, { count: s._count.psychologists })}</span></span>
                      <input name="label_el" defaultValue={labels.el} aria-label={`${s.slug} ${t.labelEl}`} className={cell} lang="el" />
                      <input name="label_en" defaultValue={labels.en} aria-label={`${s.slug} ${t.labelEn}`} className={cell} lang="en" />
                      <input name="sortOrder" type="number" min={0} defaultValue={s.sortOrder} aria-label={t.order} className={cell} />
                      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={s.active} className="size-4 accent-[var(--primary)]" /><span className="sm:sr-only">{t.active}</span></label>
                    </ActionForm>
                  </li>
                );
              })}
            </ul>
            <details className="rounded-xl border border-dashed border-border bg-surface p-3">
              <summary className="cursor-pointer text-sm font-medium text-primary">+ {t.add}</summary>
              <ActionForm action={saveSpecialty} submitLabel={t.add} errors={errors} variant="secondary" className="mt-3 grid items-end gap-2 sm:grid-cols-[9rem_1fr_1fr_4.5rem_5rem_auto]">
                <input type="hidden" name="kind" value={kind} />
                <label className="block"><span className="mb-1 block text-xs text-muted">{t.slug}</span><input name="slug" required pattern="[a-z0-9_\-]{2,40}" title={t.slugHint} className={cell} /></label>
                <label className="block"><span className="mb-1 block text-xs text-muted">{t.labelEl}</span><input name="label_el" required className={cell} /></label>
                <label className="block"><span className="mb-1 block text-xs text-muted">{t.labelEn}</span><input name="label_en" required className={cell} /></label>
                <label className="block"><span className="mb-1 block text-xs text-muted">{t.order}</span><input name="sortOrder" type="number" min={0} defaultValue={items.length} className={cell} /></label>
                <label className="flex h-10 items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked className="size-4 accent-[var(--primary)]" />{t.active}</label>
              </ActionForm>
              <p className="mt-2 text-xs text-muted">{t.slugHint}</p>
            </details>
          </section>
        );
      })}

      <section aria-labelledby="tx-languages" className="space-y-2">
        <h2 id="tx-languages" className="text-lg font-semibold text-ink">{t.languages}</h2>
        <Header t={t} />
        <ul className="space-y-2">
          {[...languages, null].map((l) => {
            const labels = (l?.labels ?? {}) as Record<string, string>;
            return (
              <li key={l?.code ?? "new"} className={`rounded-xl border bg-surface p-3 ${l ? "border-border" : "border-dashed border-border"}`}>
                <ActionForm action={saveLanguage} submitLabel={l ? t.save : t.add} savedLabel="✓" errors={errors} variant="secondary" className="grid items-center gap-2 sm:grid-cols-[9rem_1fr_1fr_4.5rem_5rem_auto]">
                  {l ? (
                    <>
                      <input type="hidden" name="code" value={l.code} />
                      <span className="font-mono text-xs text-ink">{l.code}<span className="block font-sans text-muted">{fill(t.used, { count: langCount(l.code) })}</span></span>
                    </>
                  ) : (
                    <input name="code" required maxLength={2} pattern="[a-z]{2}" title={t.languageCodeHint} placeholder="it" aria-label={t.slug} className={cell} />
                  )}
                  <input name="label_el" defaultValue={labels.el} required aria-label={t.labelEl} className={cell} lang="el" />
                  <input name="label_en" defaultValue={labels.en} required aria-label={t.labelEn} className={cell} lang="en" />
                  <input name="sortOrder" type="number" min={0} defaultValue={l?.sortOrder ?? languages.length} aria-label={t.order} className={cell} />
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={l?.active ?? true} className="size-4 accent-[var(--primary)]" /><span className="sm:sr-only">{t.active}</span></label>
                </ActionForm>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function Header({ t }: { t: Dictionary["adminX"]["taxonomy"] }) {
  return (
    <div className="hidden gap-2 px-3 text-xs font-medium text-muted sm:grid sm:grid-cols-[9rem_1fr_1fr_4.5rem_5rem_auto]">
      <span>{t.slug}</span><span>{t.labelEl}</span><span>{t.labelEn}</span><span>{t.order}</span><span>{t.active}</span><span />
    </div>
  );
}
