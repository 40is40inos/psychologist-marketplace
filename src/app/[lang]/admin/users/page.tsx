import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Search } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { setUserStatus } from "@/actions/admin";
import { ROLES, type Role } from "@/domain/roles";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/get-dictionary";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { fill, formatShortDate } from "@/lib/format";
import { buttonClass, inputClass } from "@/components/ui/form";
import { EmptyState, PageSkeleton } from "@/components/ui/page-skeleton";
import { SubmitButton } from "@/components/ui/submit-button";

export default async function UsersPage({ params, searchParams }: PageProps<"/[lang]/admin/users">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Users locale={lang} dict={dict} searchParams={searchParams} />
    </Suspense>
  );
}

async function Users({
  locale,
  dict,
  searchParams,
}: {
  locale: Locale;
  dict: Dictionary;
  searchParams: PageProps<"/[lang]/admin/users">["searchParams"];
}) {
  const admin = await requireRole(locale, "admin", `/${locale}/admin/users`);
  const t = dict.admin.users;
  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim().slice(0, 100) ?? "";
  const roleParam = Array.isArray(sp.role) ? sp.role[0] : sp.role;
  const role = (ROLES as readonly string[]).includes(roleParam ?? "") ? (roleParam as Role) : undefined;

  const where: Prisma.UserWhereInput = {
    deletedAt: null,
    ...(role && { role }),
    ...(q && {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ],
    }),
  };
  const users = await db.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
  });

  return (
    <>
      <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">{t.title}</h1>

      <form method="get" role="search" className="mt-5 grid gap-3 sm:grid-cols-[1fr_12rem_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input name="q" type="search" defaultValue={q} placeholder={t.search} aria-label={t.search} className={`${inputClass} pl-10`} />
        </div>
        <select name="role" defaultValue={role ?? ""} aria-label={t.filterAll} className={`${inputClass} appearance-none`}>
          <option value="">{t.filterAll}</option>
          {ROLES.map((r) => <option key={r} value={r}>{dict.roles[r]}</option>)}
        </select>
        <button type="submit" className={buttonClass.secondary + " h-12"}>{dict.search.submit}</button>
      </form>

      <div className="mt-6">
        {users.length ? (
          <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
            {users.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">
                    {u.name}
                    {u.id === admin.id && <span className="ml-2 text-xs text-muted">({t.you})</span>}
                  </p>
                  <p className="truncate text-sm text-muted">{u.email}</p>
                </div>
                <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium text-ink">{dict.roles[u.role]}</span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${u.status === "active" ? "bg-primary-soft text-primary" : "bg-accent-soft text-accent"}`}>
                  {u.status === "active" ? t.active : t.suspended}
                </span>
                <span className="w-32 text-sm text-muted">{fill(t.joined, { date: formatShortDate(u.createdAt, locale) })}</span>
                {u.id !== admin.id && (
                  <form action={setUserStatus}>
                    <input type="hidden" name="userId" value={u.id} />
                    <input type="hidden" name="status" value={u.status === "active" ? "suspended" : "active"} />
                    <SubmitButton variant={u.status === "active" ? "danger" : "secondary"}>
                      {u.status === "active" ? t.suspend : t.reactivate}
                    </SubmitButton>
                  </form>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title={t.empty} />
        )}
      </div>
    </>
  );
}
