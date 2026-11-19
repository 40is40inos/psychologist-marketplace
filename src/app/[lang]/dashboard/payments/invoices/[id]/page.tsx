import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { fill, formatPrice, formatShortDate } from "@/lib/format";
import { requirePsychologist } from "@/lib/workspace";
import { PrintButton } from "@/components/account/print-button";
import { PageSkeleton } from "@/components/ui/page-skeleton";

export const metadata: Metadata = { robots: { index: false } };

export default function InvoicePage(props: PageProps<"/[lang]/dashboard/payments/invoices/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Invoice {...props} />
    </Suspense>
  );
}

/** Printable receipt ("Απόδειξη Παροχής Υπηρεσιών") issued by the psychologist. */
async function Invoice({ params }: PageProps<"/[lang]/dashboard/payments/invoices/[id]">) {
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const { user, profileId } = await requirePsychologist(lang, `/${lang}/dashboard/payments/invoices/${id}`);
  const inv = await db.invoice.findFirst({
    where: { id, psychologistId: profileId },
    include: {
      appointment: { select: { startsAt: true, sessionType: true, kind: true } },
      psychologist: { select: { taxIdEncrypted: true, taxOffice: true, title: true, offices: { take: 1, select: { addressLine: true, postalCode: true } } } },
    },
  });
  if (!inv) notFound();
  const t = dict.paymentsPage;
  const p = inv.psychologist;
  const afm = p.taxIdEncrypted ? decrypt(p.taxIdEncrypted) : "—";

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between gap-2 print:hidden">
        <Link href={`/${lang}/dashboard/payments`} className="text-sm font-medium text-primary hover:underline">← {t.title}</Link>
        <PrintButton label={dict.account.print} />
      </div>
      <article className="rounded-2xl border border-border bg-surface p-6 sm:p-8 print:border-0 print:p-0">
        <header className="flex flex-wrap justify-between gap-4 border-b border-border pb-5">
          <div className="text-sm">
            <p className="text-base font-semibold text-ink">{user.name}</p>
            <p className="text-muted">{dict.titles[p.title]}</p>
            {p.offices[0] && <p className="text-muted">{p.offices[0].addressLine}, {p.offices[0].postalCode}</p>}
            <p className="text-muted">ΑΦΜ {afm}{p.taxOffice && ` · ΔΟΥ ${p.taxOffice}`}</p>
          </div>
          <div className="text-right text-sm">
            <h1 className="text-base font-semibold text-ink">Απόδειξη Παροχής Υπηρεσιών</h1>
            <p className="font-mono text-ink">{inv.series}-{inv.number}</p>
            <p className="text-muted">{formatShortDate(inv.issueDate, lang)}</p>
          </div>
        </header>
        <p className="mt-5 text-sm"><span className="text-muted">{t.client}: </span><span className="font-medium text-ink">{inv.clientName}</span></p>
        <table className="mt-5 w-full text-sm">
          <tbody className="divide-y divide-border border-y border-border">
            <tr>
              <td className="py-3 text-ink">
                {inv.appointment ? (inv.appointment.kind === "intro_call" ? dict.booking.introCall : dict.sessionTypes[inv.appointment.sessionType].label) : "—"}
                {inv.appointment && <span className="block text-muted">{formatShortDate(inv.appointment.startsAt, lang)}</span>}
              </td>
              <td className="py-3 text-right tabular-nums text-ink">{formatPrice(inv.netCents, lang)}</td>
            </tr>
            <tr>
              <td className="py-2 text-muted">ΦΠΑ {(inv.vatRateBps / 100).toFixed(0)}%{inv.vatCents === 0 && inv.vatExemption ? ` (απαλλαγή, κατηγορία ${inv.vatExemption})` : ""}</td>
              <td className="py-2 text-right tabular-nums text-muted">{formatPrice(inv.vatCents, lang)}</td>
            </tr>
            <tr>
              <td className="py-3 font-semibold text-ink">{t.amount}</td>
              <td className="py-3 text-right font-semibold tabular-nums text-ink">{formatPrice(inv.totalCents, lang)}</td>
            </tr>
          </tbody>
        </table>
        <footer className="mt-6 space-y-1 text-xs text-muted">
          <p>myDATA: {t.invoiceStatus[inv.status]}{inv.mydataMark && ` · ${fill(t.mark, { mark: inv.mydataMark })}`}{inv.mydataUid && ` · UID ${inv.mydataUid}`}</p>
          {inv.mydataQrUrl && <p><a href={inv.mydataQrUrl} className="text-primary underline" target="_blank" rel="noreferrer">{inv.mydataQrUrl}</a></p>}
        </footer>
      </article>
    </div>
  );
}
