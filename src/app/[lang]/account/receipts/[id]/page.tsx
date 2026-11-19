import { Suspense } from "react";
import { displayName } from "@/lib/slug";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { brand } from "@/config/brand";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { fill, formatPrice, formatShortDate, formatTime } from "@/lib/format";
import { PrintButton } from "@/components/account/print-button";
import { PageSkeleton } from "@/components/ui/page-skeleton";

export const metadata: Metadata = { robots: { index: false } };

export default function Page({ params }: PageProps<"/[lang]/account/receipts/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}

/** Printable payment receipt. Prints cleanly on A4 (navigation is hidden). */
async function Content({ params }: { params: PageProps<"/[lang]/account/receipts/[id]">["params"] }) {
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();
  const [dict, user] = await Promise.all([getDictionary(lang), requireRole(lang, "client", `/${lang}/account/receipts/${id}`)]);

  const p = await db.payment.findFirst({
    where: { id, status: { in: ["paid", "refunded"] }, appointment: { clientId: user.id } },
    include: {
      appointment: {
        select: {
          startsAt: true, sessionType: true, kind: true,
          psychologist: { select: { licenseNumber: true, title: true, user: { select: { name: true } } } },
        },
      },
    },
  });
  if (!p) notFound();
  const a = p.appointment;
  const t = dict.account;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link href={`/${lang}/account/receipts`} className="text-sm font-medium text-primary hover:underline">← {t.receiptsTitle}</Link>
        <PrintButton label={t.print} />
      </div>
      <article className="rounded-2xl border border-border bg-surface p-6 sm:p-8 print:border-0 print:p-0">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
          <div>
            <p className="font-display text-xl font-semibold text-ink">{brand.name}</p>
            <p className="text-sm text-muted">{brand.supportEmail}</p>
          </div>
          <div className="text-right">
            <h1 className="font-semibold text-ink">{fill(t.receipt, { number: p.receiptNumber ?? "—" })}</h1>
            {p.paidAt && <p className="text-sm text-muted">{fill(t.paidOn, { date: formatShortDate(p.paidAt, lang) })}</p>}
          </div>
        </header>
        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">{dict.roles.client}</dt>
            <dd className="font-medium text-ink">{user.name}</dd>
            <dd className="text-muted">{user.email}</dd>
          </div>
          <div>
            <dt className="text-muted">{dict.roles.psychologist}</dt>
            <dd className="font-medium text-ink">{displayName(a.psychologist.user.name, lang)}</dd>
            <dd className="text-muted">{dict.titles[a.psychologist.title]} · {a.psychologist.licenseNumber}</dd>
          </div>
        </dl>
        <table className="mt-6 w-full text-sm">
          <tbody>
            <tr className="border-y border-border">
              <td className="py-3 text-ink">
                {a.kind === "intro_call" ? dict.booking.introCall : dict.sessionTypes[a.sessionType].label}
                <span className="block text-muted">{formatShortDate(a.startsAt, lang)}, {formatTime(a.startsAt, lang)}</span>
              </td>
              <td className="py-3 text-right font-semibold tabular-nums text-ink">{formatPrice(p.amountCents, lang)}</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-4 text-right text-sm text-muted">{t.paymentStatus[p.status]}</p>
        <p className="mt-8 text-xs text-muted">{t.receiptsNote}</p>
      </article>
    </div>
  );
}
