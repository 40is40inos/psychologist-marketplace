import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { deleteContent, saveContent } from "@/actions/admin-x";
import { isLocale, locales, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/get-dictionary";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { fill } from "@/lib/format";
import { ActionForm } from "@/components/ui/action-form";
import { buttonClass, Field, FormAlert, inputClass, textareaClass } from "@/components/ui/form";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { SubmitButton } from "@/components/ui/submit-button";

export default function AdminContentEditPage(props: PageProps<"/[lang]/admin/content/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Editor {...props} />
    </Suspense>
  );
}

async function Editor({ params, searchParams }: PageProps<"/[lang]/admin/content/[id]">) {
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  await requireRole(lang, "admin", `/${lang}/admin/content/${id}`);
  const sp = await searchParams;
  const page = id === "new" ? null : await db.contentPage.findUnique({ where: { id }, include: { translations: true } });
  if (id !== "new" && !page) notFound();
  const kind = page?.kind ?? (sp.kind === "page" ? "page" : "article");
  return <EditorForm locale={lang} dict={dict} page={page} kind={kind} saved={!!sp.saved} />;
}

function EditorForm({
  locale,
  dict,
  page,
  kind,
  saved,
}: {
  locale: Locale;
  dict: Dictionary;
  page: Awaited<ReturnType<typeof db.contentPage.findUnique<{ where: { id: string }; include: { translations: true } }>>>;
  kind: "article" | "page";
  saved: boolean;
}) {
  const t = dict.adminX.content;
  const publicPath = page ? `/${locale}/${kind === "article" ? "blog" : "p"}/${page.slug}` : null;
  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={`/${locale}/admin/content`} className="text-sm font-medium text-primary hover:underline">← {t.back}</Link>
          <h1 className="mt-2 font-display text-2xl font-semibold text-ink">{page ? t.edit : kind === "article" ? t.newArticle : t.newPage}</h1>
        </div>
        {publicPath && page?.status === "published" && (
          <Link href={publicPath} className={buttonClass.secondary} target="_blank"><ExternalLink className="size-4" aria-hidden="true" />{t.view}</Link>
        )}
      </div>
      {saved && <FormAlert tone="success">{dict.workspace.saved}</FormAlert>}

      <ActionForm action={saveContent} submitLabel={t.save} errors={{ invalid: dict.workspace.saveError }} className="space-y-6">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="kind" value={kind} />
        {page && <input type="hidden" name="id" value={page.id} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="slug" label={t.slug}><input id="slug" name="slug" required pattern="[a-z0-9\-]{2,80}" defaultValue={page?.slug} className={`${inputClass} font-mono`} /></Field>
          <Field id="coverUrl" label={t.coverUrl}><input id="coverUrl" name="coverUrl" type="url" defaultValue={page?.coverUrl ?? ""} className={inputClass} /></Field>
        </div>
        {locales.map((l) => {
          const tr = page?.translations.find((x) => x.locale === l);
          return (
            <fieldset key={l} lang={l} className="space-y-4 rounded-2xl border border-border bg-surface p-4 sm:p-5">
              <legend className="px-1 text-sm font-semibold text-ink">{fill(t.inLanguage, { language: dict.languages[l] })}</legend>
              <Field id={`title_${l}`} label={t.titleField}><input id={`title_${l}`} name={`title_${l}`} maxLength={200} defaultValue={tr?.title} className={inputClass} /></Field>
              <Field id={`excerpt_${l}`} label={t.excerpt}><textarea id={`excerpt_${l}`} name={`excerpt_${l}`} rows={2} maxLength={500} defaultValue={tr?.excerpt ?? ""} className={textareaClass} /></Field>
              <Field id={`body_${l}`} label={t.body} hint={t.bodyHint}><textarea id={`body_${l}`} name={`body_${l}`} rows={14} defaultValue={tr?.body} className={`${textareaClass} font-mono text-sm`} aria-describedby={`body_${l}-hint`} /></Field>
            </fieldset>
          );
        })}
        <label className="flex items-center gap-3 text-ink">
          <input type="checkbox" name="published" defaultChecked={page?.status === "published"} className="size-5 accent-[var(--primary)]" />
          {t.publish}
        </label>
      </ActionForm>

      {page && (
        <form action={deleteContent} className="border-t border-border pt-5">
          <input type="hidden" name="id" value={page.id} />
          <input type="hidden" name="locale" value={locale} />
          <SubmitButton variant="danger">{t.delete}</SubmitButton>
        </form>
      )}
    </div>
  );
}
