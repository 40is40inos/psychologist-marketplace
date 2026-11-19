import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Search } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { refundPayment } from "@/actions/admin-x";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/get-dictionary";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { fill, formatPrice, formatShortDate, formatTime } from "@/lib/format";
import { zonedToUtc } from "@/lib/time";
import { ActionForm } from "@/components/ui/action-form";
import { buttonClass, inputClass } from "@/components/ui/form";
import { EmptyState, PageSkeleton } from "@/components/ui/page-skeleton";

const STATUSES = ["pending", "confirmed", "completed", "no_show", "cancelled_by_client", "cancelled_by_psychologist"] as const;
const PAYMENTS = ["pending", "paid", "refunded", "waived"] as const;

export default async function AdminBookingsPage({ params, searchParams }: PageProps<"/[lang]/admin/bookings">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Bookings locale={lang} dict={dict} searchParams={searchParams} />
    </Suspense>
  );
}

const day = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "");
const toUtc = (d: string, endOfDay = false) => {
  const [y, m, dd] = d.split("-").map(Number);
  return zonedToUtc(y, m, dd, endOfDay ? 24 * 60 : 0);
};

async function Bookings({ locale, dict, searchParams }: { locale: Locale; dict: Dictionary; searchParams: PageProps<"/[lang]/admin/bookings">["searchParams"] }) {
  await requireRole(locale, "admin", `/${locale}/admin/bookings`);
  const t = dict.adminX.bookings;
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 100) : "";
  const status = (STATUSES as readonly string[]).includes(String(sp.status)) ? (sp.status as (typeof STATUSES)[number]) : undefined;
  const payment = (PAYMENTS as readonly string[]).includes(String(sp.payment)) ? (sp.payment as (typeof PAYMENTS)[number]) : undefined;
  const from = day(sp.from);
  const to = day(sp.to);

  const where: Prisma.AppointmentWhereInput = {
    ...(status && { status }),
    ...(payment && { payment: { status: payment } }),
    ...((from || to) && { startsAt: { ...(from && { gte: toUtc(from) }), ...(to && { lt: toUtc(to, true) }) } }),
    ...(q && {
      OR: [
        { id: q },
        { client: { name: { contains: q, mode: "insensitive" } } },
        { client: { email: { contains: q, mode: "insensitive" } } },
        { psychologist: { user: { name: { contains: q, mode: "insensitive" } } } },
      ],
    }),
  };
  const [rows, totals] = await Promise.all([
    db.appointment.findMany({
      where,
      orderBy: { startsAt: "desc" },
      take: 100,
      include: {
        client: { select: { name: true, email: true } },
        psychologist: { select: { user: { select: { name: true } } } },
        payment: true,
        disputes: { select: { id: true, status: true } },
      },
    }),
    db.payment.aggregate({ where: { appointment: where }, _sum: { amountCents: true, commissionCents: true, refundedCents: true }, _count: true }),
  ]);
  const paidTotal = await db.payment.aggregate({ where: { appointment: where, status: { in: ["paid", "refunded"] } }, _sum: { amountCents: true } });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold text-ink">{t.title}</h1>
      <form method="get" className="grid gap-3 rounded-2xl border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] lg:items-end">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">{t.search}</span>
          <span className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input name="q" type="search" defaultValue={q} className={`${inputClass} pl-9`} />
          </span>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">{t.status}</span>
          <select name="status" defaultValue={status ?? ""} className={`${inputClass} appearance-none`}>
            <option value="">{t.allStatuses}</option>
            {STATUSES.map((s) => <option key={s} value={s}>{dict.appointmentStatus[s]}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">{t.payment}</span>
          <select name="payment" defaultValue={payment ?? ""} className={`${inputClass} appearance-none`}>
            <option value="">{t.allPayments}</option>
            {PAYMENTS.map((s) => <option key={s} value={s}>{dict.account.paymentStatus[s]}</option>)}
          </select>
        </label>
        <label className="block"><span className="mb-1 block text-xs font-medium text-muted">{t.from}</span><input name="from" type="date" defaultValue={from} className={inputClass} /></label>
        <label className="block"><span className="mb-1 block text-xs font-medium text-muted">{t.to}</span><input name="to" type="date" defaultValue={to} className={inputClass} /></label>
        <button type="submit" className={`${buttonClass.secondary} h-12`}>{t.filter}</button>
      </form>

      <p className="text-sm text-muted">
        {fill(t.totals, {
          count: totals._count,
          paid: formatPrice(paidTotal._sum.amountCents ?? 0, locale),
          fees: formatPrice(totals._sum.commissionCents ?? 0, locale),
          refunded: formatPrice(totals._sum.refundedCents ?? 0, locale),
        })}
      </p>

      {rows.length === 0 ? (
        <EmptyState title={t.empty} />
      ) : (
        <ul className="space-y-3">
          {rows.map((a) => {
            const pay = a.payment;
            const refundable = pay && pay.status === "paid" && pay.refundedCents < pay.amountCents;
            return (
              <li key={a.id} className="rounded-2xl border border-border bg-surface p-4">
                <div className="grid gap-3 text-sm sm:grid-cols-[1.2fr_1.2fr_1fr_1fr]">
                  <div>
                    <p className="text-xs text-muted">{t.client}</p>
                    <p className="font-medium text-ink">{a.client.name}</p>
                    <p className="truncate text-muted">{a.client.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">{t.psychologist}</p>
                    <p className="font-medium text-ink">{a.psychologist.user.name}</p>
                    <p className="text-muted">{a.kind === "intro_call" ? dict.booking.introCall : dict.sessionTypes[a.sessionType].label}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">{t.when}</p>
                    <p className="text-ink">{formatShortDate(a.startsAt, locale)}, {formatTime(a.startsAt, locale)}</p>
                    <p className="text-muted">{a.lateCancellation ? dict.account.lateCancellation : dict.appointmentStatus[a.status]}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">{t.amount}</p>
                    <p className="font-semibold tabular-nums text-ink">{a.priceCents === 0 ? dict.booking.free : formatPrice(a.priceCents, locale)}</p>
                    {pay && <p className="text-muted">{dict.account.paymentStatus[pay.status]}{pay.commissionCents > 0 && ` · ${fill(t.fee, { amount: formatPrice(pay.commissionCents, locale) })}`}</p>}
                    {pay && pay.refundedCents > 0 && <p className="text-accent">{fill(t.refunded, { amount: formatPrice(pay.refundedCents, locale) })}</p>}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-start gap-3">
                  {a.disputes.map((d) => (
                    <Link key={d.id} href={`/${locale}/admin/disputes`} className="text-sm font-medium text-primary hover:underline">
                      {t.dispute}: {dict.admin.disputes.statuses[d.status]}
                    </Link>
                  ))}
                  {refundable && (
                    <details className="w-full">
                      <summary className="cursor-pointer text-sm font-medium text-accent">{t.refund}</summary>
                      <div className="mt-2 rounded-xl border border-accent/30 bg-accent-soft/50 p-3">
                        <p className="mb-2 text-xs text-muted">{t.refundHint}</p>
                        <ActionForm action={refundPayment} submitLabel={t.refundConfirm} savedLabel={dict.workspace.saved} errors={{ invalid: dict.workspace.saveError, tooMuch: t.refundTooMuch, reason: t.reasonRequired }} variant="secondary" className="grid gap-3 sm:grid-cols-[8rem_1fr_auto] sm:items-end">
                          <input type="hidden" name="paymentId" value={pay.id} />
                          <label className="block"><span className="mb-1 block text-xs text-muted">{t.refundAmount}</span><input name="amount" type="number" step="0.01" min="0.01" defaultValue={(pay.amountCents - pay.refundedCents) / 100} className={inputClass} /></label>
                          <label className="block"><span className="mb-1 block text-xs text-muted">{t.refundReason}</span><input name="reason" required maxLength={500} className={inputClass} /></label>
                        </ActionForm>
                      </div>
                    </details>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
