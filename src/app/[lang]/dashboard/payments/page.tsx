import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { retryInvoice, saveMydataCredentials } from "@/actions/payments";
import { openPayoutDashboard, startPayoutSetup } from "@/actions/payouts";
import { cardPaymentsEnabled, fetchAccountReady } from "@/lib/payments";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/get-dictionary";
import { db } from "@/lib/db";
import { fill, formatPrice, formatShortDate } from "@/lib/format";
import { planFor } from "@/lib/plans";
import { requirePsychologist } from "@/lib/workspace";
import { daysAgo } from "@/lib/time";
import { ActionForm } from "@/components/ui/action-form";
import { Field, inputClass } from "@/components/ui/form";
import { EmptyState, PageSkeleton } from "@/components/ui/page-skeleton";
import { SubmitButton } from "@/components/ui/submit-button";

export const metadata: Metadata = { robots: { index: false } };

export default async function PaymentsPage({ params }: PageProps<"/[lang]/dashboard/payments">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Payments locale={lang} dict={dict} />
    </Suspense>
  );
}

async function Payments({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const { profileId } = await requirePsychologist(locale, `/${locale}/dashboard/payments`);
  const t = dict.paymentsPage;
  const since = daysAgo(30);

  const [paid, unpaid, invoices, payouts, plan, profile] = await Promise.all([
    db.payment.aggregate({ where: { status: "paid", paidAt: { gte: since }, appointment: { psychologistId: profileId } }, _sum: { amountCents: true, commissionCents: true }, _count: true }),
    db.payment.aggregate({
      where: { status: "pending", amountCents: { gt: 0 }, appointment: { psychologistId: profileId, OR: [{ status: { in: ["completed", "no_show"] } }, { lateCancellation: true }] } },
      _sum: { amountCents: true },
    }),
    db.invoice.findMany({ where: { psychologistId: profileId }, orderBy: [{ issueDate: "desc" }, { number: "desc" }], take: 100 }),
    db.payout.findMany({ where: { psychologistId: profileId }, orderBy: { periodStart: "desc" }, take: 24 }),
    planFor(profileId, locale),
    db.psychologistProfile.findUniqueOrThrow({ where: { id: profileId }, select: { mydataUserEncrypted: true, taxIdEncrypted: true, stripeAccountId: true, stripeReady: true } }),
  ]);
  // Returning from Stripe onboarding: refresh the status now rather than waiting for the webhook.
  let payoutsReady = profile.stripeReady;
  if (cardPaymentsEnabled() && profile.stripeAccountId && !payoutsReady) {
    payoutsReady = await fetchAccountReady(profile.stripeAccountId).catch(() => false);
    if (payoutsReady) await db.psychologistProfile.update({ where: { id: profileId }, data: { stripeReady: true } });
  }
  const gross = paid._sum.amountCents ?? 0;
  const commission = paid._sum.commissionCents ?? 0;
  const connected = !!profile.mydataUserEncrypted;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">{t.title}</h1>
        {plan && <p className="mt-1 text-sm text-muted">{fill(t.planLine, { plan: plan.name, percent: (plan.commissionBps / 100).toLocaleString(locale) })} · <Link href={`/${locale}/dashboard/plan`} className="text-primary hover:underline">{dict.workspace.upgrade}</Link></p>}
      </div>

      <section aria-labelledby="earnings">
        <h2 id="earnings" className="mb-3 text-sm font-medium text-muted">{t.period}</h2>
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label={`${t.gross} (${paid._count})`} value={formatPrice(gross, locale)} />
          <Stat label={t.commission} value={formatPrice(commission, locale)} />
          <Stat label={t.net} value={formatPrice(gross - commission, locale)} strong />
          <Stat label={t.unpaid} value={formatPrice(unpaid._sum.amountCents ?? 0, locale)} />
        </dl>
      </section>

      <section aria-labelledby="payouts" className="space-y-3 rounded-3xl border border-border bg-surface p-5 sm:p-6">
        <h2 id="payouts" className="text-lg font-semibold text-ink">{dict.payouts.title}</h2>
        {!cardPaymentsEnabled() ? (
          <p className="text-muted">{dict.payouts.disabled}</p>
        ) : payoutsReady ? (
          <>
            <p className="flex items-center gap-2 font-medium text-primary"><CheckCircle2 className="size-5" aria-hidden="true" />{dict.payouts.ready}</p>
            <p className="text-sm text-muted">{dict.payouts.readyBody}</p>
            <form action={openPayoutDashboard}>
              <input type="hidden" name="locale" value={locale} />
              <SubmitButton variant="secondary">{dict.payouts.dashboard}</SubmitButton>
            </form>
          </>
        ) : (
          <>
            <p className="text-muted">{profile.stripeAccountId ? dict.payouts.pending : dict.payouts.intro}</p>
            <form action={startPayoutSetup}>
              <input type="hidden" name="locale" value={locale} />
              <SubmitButton>{profile.stripeAccountId ? dict.payouts.resume : dict.payouts.start}</SubmitButton>
            </form>
          </>
        )}
      </section>

      <section aria-labelledby="invoices" className="space-y-3">
        <div>
          <h2 id="invoices" className="text-lg font-semibold text-ink">{t.invoices}</h2>
          <p className="text-sm text-muted">{t.invoicesHint}</p>
        </div>
        {invoices.length === 0 ? (
          <EmptyState title={t.noInvoices} />
        ) : (
          <div className="relative overflow-x-auto rounded-2xl border border-border bg-surface">
            <table className="w-full min-w-[36rem] text-sm">
              <thead className="border-b border-border text-left text-muted">
                <tr>
                  <th className="p-3 font-medium">{t.number}</th>
                  <th className="p-3 font-medium">{t.date}</th>
                  <th className="p-3 font-medium">{t.client}</th>
                  <th className="p-3 text-right font-medium">{t.amount}</th>
                  <th className="p-3 font-medium">{t.status}</th>
                  <th className="p-3"><span className="sr-only">{t.view}</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoices.map((inv) => (
                  <tr key={inv.id} id={`inv-${inv.number}`}>
                    <td className="p-3 font-mono text-ink">{inv.series}-{inv.number}</td>
                    <td className="p-3 text-ink">{formatShortDate(inv.issueDate, locale)}</td>
                    <td className="p-3 text-ink">{inv.clientName}</td>
                    <td className="p-3 text-right font-semibold tabular-nums text-ink">{formatPrice(inv.totalCents, locale)}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 ${inv.status === "transmitted" ? "text-primary" : inv.status === "failed" ? "text-accent" : "text-muted"}`}>
                        {inv.status === "transmitted" ? <CheckCircle2 className="size-4" aria-hidden="true" /> : inv.status === "failed" ? <CircleAlert className="size-4" aria-hidden="true" /> : null}
                        {t.invoiceStatus[inv.status]}
                      </span>
                      {inv.mydataMark && <span className="block font-mono text-xs text-muted">{fill(t.mark, { mark: inv.mydataMark })}</span>}
                      {inv.status === "failed" && inv.mydataError && <span className="block max-w-xs truncate text-xs text-accent" title={inv.mydataError}>{inv.mydataError}</span>}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-2">
                        {connected && (inv.status === "issued" || inv.status === "failed") && (
                          <form action={retryInvoice}><input type="hidden" name="invoiceId" value={inv.id} /><SubmitButton variant="secondary">{t.retry}</SubmitButton></form>
                        )}
                        <Link href={`/${locale}/dashboard/payments/invoices/${inv.id}`} className="inline-flex h-11 items-center px-2 font-medium text-primary hover:underline">{t.view}</Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="mydata" className="space-y-3">
        <div>
          <h2 id="mydata" className="text-lg font-semibold text-ink">{t.mydata}</h2>
          <p className="text-sm text-muted">{t.mydataHint}</p>
        </div>
        <p className={`flex items-center gap-2 text-sm font-medium ${connected ? "text-primary" : "text-muted"}`}>
          {connected ? <CheckCircle2 className="size-4" aria-hidden="true" /> : <CircleAlert className="size-4" aria-hidden="true" />}
          {connected ? t.mydataConnected : t.mydataNotConnected}
        </p>
        <div className="rounded-2xl border border-border bg-surface p-5">
          {profile.taxIdEncrypted ? (
            <ActionForm action={saveMydataCredentials} submitLabel={dict.workspace.save} savedLabel={dict.workspace.saved} errors={{ invalid: dict.workspace.saveError, taxId: t.needTaxId }}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="mydataUser" label={t.mydataUser}><input id="mydataUser" name="mydataUser" autoComplete="off" className={inputClass} /></Field>
                <Field id="mydataKey" label={t.mydataKey}><input id="mydataKey" name="mydataKey" type="password" autoComplete="off" className={inputClass} /></Field>
              </div>
            </ActionForm>
          ) : (
            <p className="text-sm text-muted">{t.needTaxId} <Link href={`/${locale}/dashboard/profile?step=payout`} className="font-medium text-primary hover:underline">{dict.onboarding.steps.payout} →</Link></p>
          )}
        </div>
      </section>

      <section aria-labelledby="payouts" className="space-y-3">
        <div>
          <h2 id="payouts" className="text-lg font-semibold text-ink">{t.payouts}</h2>
          <p className="text-sm text-muted">{t.payoutsHint}</p>
        </div>
        {payouts.length === 0 ? (
          <p className="text-sm text-muted">{t.noPayouts}</p>
        ) : (
          <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
            {payouts.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                <span className="text-ink">{formatShortDate(p.periodStart, locale)} – {formatShortDate(p.periodEnd, locale)}</span>
                <span className="text-muted">{formatPrice(p.grossCents, locale)} − {formatPrice(p.commissionCents, locale)}</span>
                <span className="font-semibold tabular-nums text-ink">{formatPrice(p.netCents, locale)}</span>
                <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium">{t.payoutStatus[p.status]}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${strong ? "border-primary/30 bg-primary-soft" : "border-border bg-surface"}`}>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 font-display text-2xl font-semibold tabular-nums text-ink">{value}</dd>
    </div>
  );
}
