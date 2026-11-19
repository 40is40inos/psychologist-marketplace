import { Suspense } from "react";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/get-dictionary";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { fill, formatShortDate, formatTime } from "@/lib/format";
import { buttonClass, inputClass } from "@/components/ui/form";
import { EmptyState, PageSkeleton } from "@/components/ui/page-skeleton";

export default async function AuditPage({ params, searchParams }: PageProps<"/[lang]/admin/audit">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Audit locale={lang} dict={dict} searchParams={searchParams} />
    </Suspense>
  );
}

async function Audit({ locale, dict, searchParams }: { locale: Locale; dict: Dictionary; searchParams: PageProps<"/[lang]/admin/audit">["searchParams"] }) {
  await requireRole(locale, "admin", `/${locale}/admin/audit`);
  const t = dict.auditPage;
  const labels = dict.admin.actions as Record<string, string>;
  const sp = await searchParams;
  const action = typeof sp.action === "string" && sp.action in labels ? sp.action : undefined;
  const entries = await db.auditLog.findMany({
    where: action ? { action } : {},
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { actor: { select: { name: true, role: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">{t.title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted">{t.hint}</p>
      </div>
      <form method="get" className="flex flex-wrap items-end gap-2">
        <label className="block">
          <span className="mb-1 block text-xs text-muted">{t.filter}</span>
          <select name="action" defaultValue={action ?? ""} className={`${inputClass} appearance-none`}>
            <option value="">{t.all}</option>
            {Object.keys(labels).map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
        <button type="submit" className={`${buttonClass.secondary} h-12`}>{dict.adminX.bookings.filter}</button>
      </form>
      {entries.length === 0 ? (
        <EmptyState title={t.empty} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="border-b border-border text-left text-muted">
              <tr>
                <th className="p-3 font-medium">{t.when}</th>
                <th className="p-3 font-medium">{t.actor}</th>
                <th className="p-3 font-medium">{t.action}</th>
                <th className="p-3 font-medium">{t.target}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entries.map((e) => {
                const target = (e.metadata as { name?: string } | null)?.name ?? "";
                return (
                  <tr key={e.id}>
                    <td className="whitespace-nowrap p-3 tabular-nums text-muted">{formatShortDate(e.createdAt, locale)} {formatTime(e.createdAt, locale)}</td>
                    <td className="p-3 text-ink">{e.actor.name} <span className="text-xs text-muted">({dict.roles[e.actor.role]})</span></td>
                    <td className="p-3 text-ink">{fill(labels[e.action] ?? e.action, { target })}<span className="block font-mono text-xs text-muted">{e.action}</span></td>
                    <td className="p-3 font-mono text-xs text-muted">{e.targetType} · {e.targetId.slice(0, 24)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
