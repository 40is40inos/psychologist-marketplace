import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/get-dictionary";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatShortDate } from "@/lib/format";
import { buttonClass } from "@/components/ui/form";
import { PageSkeleton } from "@/components/ui/page-skeleton";

export default async function AdminContentPage({ params }: PageProps<"/[lang]/admin/content">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ContentList locale={lang} dict={dict} />
    </Suspense>
  );
}

async function ContentList({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  await requireRole(locale, "admin", `/${locale}/admin/content`);
  const t = dict.adminX.content;
  const pages = await db.contentPage.findMany({ orderBy: [{ kind: "asc" }, { updatedAt: "desc" }], include: { translations: { select: { locale: true, title: true } } } });
  const base = `/${locale}/admin/content`;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold text-ink">{t.title}</h1>
        <div className="flex gap-2">
          <Link href={`${base}/new?kind=article`} className={buttonClass.primary}><Plus className="size-4" aria-hidden="true" />{t.newArticle}</Link>
          <Link href={`${base}/new?kind=page`} className={buttonClass.secondary}><Plus className="size-4" aria-hidden="true" />{t.newPage}</Link>
        </div>
      </div>
      {(["article", "page"] as const).map((kind) => {
        const items = pages.filter((p) => p.kind === kind);
        return (
          <section key={kind} aria-labelledby={`c-${kind}`}>
            <h2 id={`c-${kind}`} className="mb-2 text-lg font-semibold text-ink">{kind === "article" ? t.articles : t.pages}</h2>
            {items.length === 0 ? (
              <p className="text-sm text-muted">{t.empty}</p>
            ) : (
              <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
                {items.map((p) => {
                  const title = (p.translations.find((x) => x.locale === locale) ?? p.translations[0])?.title ?? p.slug;
                  return (
                    <li key={p.id} className="flex flex-wrap items-center gap-3 p-4">
                      <div className="min-w-0 flex-1">
                        <Link href={`${base}/${p.id}`} className="font-medium text-ink hover:underline">{title}</Link>
                        <p className="text-sm text-muted">/{kind === "article" ? "blog" : "p"}/{p.slug} · {p.translations.map((x) => x.locale.toUpperCase()).join(", ")} · {formatShortDate(p.updatedAt, locale)}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${p.status === "published" ? "bg-primary-soft text-primary" : "bg-surface-muted text-muted"}`}>{t.status[p.status]}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
