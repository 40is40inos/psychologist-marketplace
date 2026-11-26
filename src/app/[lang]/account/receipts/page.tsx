import { privatePageMetadata } from "@/lib/page-metadata";
import { Suspense } from "react";
import { displayName } from "@/lib/slug";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Receipt } from "lucide-react";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { fill, formatPrice, formatShortDate } from "@/lib/format";
import { EmptyState, PageSkeleton } from "@/components/ui/page-skeleton";

export const generateMetadata = privatePageMetadata((d) => d.account.receiptsTitle);

export default function Page({ params }: PageProps<"/[lang]/account/receipts">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/[lang]/account/receipts">["params"] }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const [dict, user] = await Promise.all([getDictionary(lang), requireRole(lang, "client", `/${lang}/account/receipts`)]);
  const t = dict.account;

  const payments = await db.payment.findMany({
    where: { status: { in: ["paid", "refunded"] }, appointment: { clientId: user.id } },
    orderBy: { paidAt: "desc" },
    include: { appointment: { select: { startsAt: true, psychologist: { select: { user: { select: { name: true } } } } } } },
  });

  return (
    <>
      <h1 className="font-display text-2xl font-semibold text-ink">{t.receiptsTitle}</h1>
      <p className="mt-1 text-sm text-muted">{t.receiptsNote}</p>
      <div className="mt-6">
        {payments.length === 0 ? (
          <EmptyState scene="receipts" title={t.receiptsEmpty} />
        ) : (
          <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
            {payments.map((p) => (
              <li key={p.id}>
                <Link href={`/${lang}/account/receipts/${p.id}`} className="flex items-center gap-4 p-4 hover:bg-surface-muted">
                  <Receipt className="size-5 shrink-0 text-primary" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-ink">{fill(t.receipt, { number: p.receiptNumber ?? "—" })}</p>
                    <p className="truncate text-sm text-muted">
                      {displayName(p.appointment.psychologist.user.name, lang)} · {formatShortDate(p.appointment.startsAt, lang)}
                    </p>
                  </div>
                  <span className="text-right">
                    <span className="block font-semibold tabular-nums text-ink">{formatPrice(p.amountCents, lang)}</span>
                    <span className="block text-xs text-muted">{t.paymentStatus[p.status]}</span>
                  </span>
                  <ChevronRight className="size-4 text-muted" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
