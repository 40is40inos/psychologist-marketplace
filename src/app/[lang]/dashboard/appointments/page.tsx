import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LifeBuoy, MapPin, MessageCircle, Video } from "lucide-react";
import { appointmentAction, markPaid } from "@/actions/appointments";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/get-dictionary";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { fill, formatPrice, formatShortDate, formatTime } from "@/lib/format";
import { joinWindow } from "@/lib/video";
import { requirePsychologist } from "@/lib/workspace";
import { logAccess } from "@/lib/audit";
import { SessionTypeIcon } from "@/components/session-type-icon";
import { buttonClass } from "@/components/ui/form";
import { EmptyState, PageSkeleton } from "@/components/ui/page-skeleton";
import { SubmitButton } from "@/components/ui/submit-button";

export const metadata: Metadata = { robots: { index: false } };

type Tab = "requests" | "upcoming" | "past";

export default async function AppointmentsPage({ params, searchParams }: PageProps<"/[lang]/dashboard/appointments">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Appointments locale={lang} dict={dict} searchParams={searchParams} />
    </Suspense>
  );
}

function intakeOf(enc: string | null): { reason?: string; firstTime?: string; notes?: string } | null {
  if (!enc) return null;
  try {
    return JSON.parse(decrypt(enc));
  } catch {
    return null;
  }
}

async function Appointments({ locale, dict, searchParams }: { locale: Locale; dict: Dictionary; searchParams: PageProps<"/[lang]/dashboard/appointments">["searchParams"] }) {
  const { user, profileId } = await requirePsychologist(locale, `/${locale}/dashboard/appointments`);
  const sp = await searchParams;
  const t = dict.apptPage;
  const now = new Date();

  const all = await db.appointment.findMany({
    where: { psychologistId: profileId, rescheduledTo: null },
    orderBy: { startsAt: "asc" },
    take: 300,
    include: {
      client: { select: { id: true, name: true } },
      payment: { select: { status: true, receiptNumber: true, commissionCents: true } },
      invoice: { select: { number: true, series: true, status: true } },
      psychologist: { select: { offices: { take: 1, select: { addressLine: true } } } },
    },
  });
  const requests = all.filter((a) => a.status === "pending" && a.startsAt > now);
  const upcoming = all.filter((a) => a.status === "confirmed" && a.endsAt > now);
  const past = all.filter((a) => !requests.includes(a) && !upcoming.includes(a)).reverse();
  const tab: Tab = sp.tab === "past" ? "past" : sp.tab === "requests" || (requests.length > 0 && sp.tab !== "upcoming") ? "requests" : "upcoming";
  const list = { requests, upcoming, past }[tab];
  const withIntake = list.filter((a) => a.intakeEncrypted).map((a) => a.id);
  if (withIntake.length) logAccess(user.id, "intake.view", "Appointment", withIntake.join(",").slice(0, 190), { count: withIntake.length });
  const conversations = new Map(
    (await db.conversation.findMany({ where: { psychologistId: profileId }, select: { id: true, clientId: true } })).map((c) => [c.clientId, c.id]),
  );
  const base = `/${locale}/dashboard/appointments`;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold text-ink">{t.title}</h1>
      <div className="inline-flex rounded-xl border border-border p-1" role="tablist">
        {(["requests", "upcoming", "past"] as const).map((k) => (
          <Link key={k} href={`${base}?tab=${k}`} role="tab" aria-selected={tab === k} className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium ${tab === k ? "bg-primary-soft text-primary" : "text-muted hover:text-ink"}`}>
            {t.tabs[k]}
            {k === "requests" && requests.length > 0 && <span className="rounded-full bg-accent px-1.5 text-xs text-white">{requests.length}</span>}
          </Link>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyState scene="calendar" title={{ requests: t.noRequests, upcoming: t.noUpcoming, past: t.noPast }[tab]} />
      ) : (
        <ul className="space-y-3">
          {list.map((a) => {
            const intake = intakeOf(a.intakeEncrypted);
            const started = a.startsAt <= now;
            const win = joinWindow(a.startsAt, a.endsAt);
            const online = a.sessionType !== "in_person";
            const convo = conversations.get(a.client.id);
            return (
              <li key={a.id} id={a.id} className="scroll-mt-24 rounded-2xl border border-border bg-surface p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">
                      <Link href={`/${locale}/dashboard/clients/${a.client.id}`} className="hover:underline">{a.client.name}</Link>
                    </p>
                    <p className="text-sm text-muted">
                      {formatShortDate(a.startsAt, locale)}, {formatTime(a.startsAt, locale)}–{formatTime(a.endsAt, locale)}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-ink">
                      <SessionTypeIcon type={a.sessionType} className="size-4 text-primary" />
                      {a.kind === "intro_call" ? dict.booking.introCall : dict.sessionTypes[a.sessionType].label} · {a.priceCents === 0 ? dict.booking.free : formatPrice(a.priceCents, locale)}
                      {a.sessionType === "in_person" && a.psychologist.offices[0] && (
                        <span className="flex items-center gap-1 text-muted"><MapPin className="size-3.5" aria-hidden="true" />{a.psychologist.offices[0].addressLine}</span>
                      )}
                    </p>
                  </div>
                  <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium text-ink">
                    {a.lateCancellation ? dict.account.lateCancellation : dict.appointmentStatus[a.status]}
                    {a.payment?.status === "paid" && ` · ${t.paid}`}
                  </span>
                </div>

                {a.intakeRisk && (
                  <p role="note" className="mt-3 flex gap-2 rounded-xl border border-accent/40 bg-accent-soft p-3 text-sm font-medium text-ink">
                    <LifeBuoy className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
                    {dict.risk.flagged}
                  </p>
                )}
                {intake && (intake.reason || intake.notes || intake.firstTime) && (
                  <details className="mt-3 rounded-xl bg-surface-muted/60 p-3 text-sm">
                    <summary className="cursor-pointer font-medium text-ink">{t.intake}</summary>
                    {intake.reason && <p className="mt-2 whitespace-pre-line text-ink">{intake.reason}</p>}
                    {intake.firstTime && <p className="mt-1 text-muted">{fill(t.firstTime, { answer: intake.firstTime === "yes" ? dict.booking.yes : dict.booking.no })}</p>}
                    {intake.notes && <p className="mt-1 whitespace-pre-line text-muted">{intake.notes}</p>}
                  </details>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {a.status === "pending" && !started && (
                    <>
                      <ActionButton id={a.id} action="accept" label={t.accept} variant="primary" />
                      <ActionButton id={a.id} action="decline" label={t.decline} variant="danger" />
                    </>
                  )}
                  {a.status === "confirmed" && online && (
                    win.open ? (
                      <Link href={`/${locale}/session/${a.id}`} className={buttonClass.primary}><Video className="size-4" aria-hidden="true" />{t.join}</Link>
                    ) : !started ? (
                      <span className="text-sm text-muted">{fill(t.joinOpens, { time: `${formatShortDate(win.opens, locale)} ${formatTime(win.opens, locale)}` })}</span>
                    ) : null
                  )}
                  {a.status === "confirmed" && !started && (
                    <>
                      <Link href={`${base}/${a.id}/reschedule`} className={buttonClass.secondary}>{t.reschedule}</Link>
                      <details className="group">
                        <summary className={`${buttonClass.danger} cursor-pointer list-none`}>{t.cancel}</summary>
                        <div className="mt-2 rounded-xl border border-accent/30 bg-accent-soft p-3 text-sm">
                          <p className="text-ink">{t.confirmCancel}</p>
                          <div className="mt-2"><ActionButton id={a.id} action="cancel" label={t.cancel} variant="danger" /></div>
                        </div>
                      </details>
                    </>
                  )}
                  {a.status === "confirmed" && started && (
                    <>
                      <ActionButton id={a.id} action="complete" label={t.complete} variant="secondary" />
                      <ActionButton id={a.id} action="no_show" label={t.noShow} variant="danger" />
                    </>
                  )}
                  {(a.status === "completed" || a.status === "no_show" || a.lateCancellation) && a.priceCents > 0 && a.payment?.status === "pending" && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm text-muted">{t.markPaid}:</span>
                      {(["cash", "card"] as const).map((m) => (
                        <form key={m} action={markPaid}>
                          <input type="hidden" name="appointmentId" value={a.id} />
                          <input type="hidden" name="method" value={m} />
                          <SubmitButton variant="secondary">{m === "cash" ? t.paidCash : t.paidCard}</SubmitButton>
                        </form>
                      ))}
                    </div>
                  )}
                  {a.invoice && (
                    <Link href={`/${locale}/dashboard/payments#inv-${a.invoice.number}`} className="text-sm font-medium text-primary hover:underline">
                      {fill(t.receipt, { number: `${a.invoice.series}-${a.invoice.number}` })} · {dict.paymentsPage.invoiceStatus[a.invoice.status]}
                    </Link>
                  )}
                  {convo && (
                    <Link href={`/${locale}/dashboard/messages/${convo}`} className="ml-auto inline-flex h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-muted hover:text-ink">
                      <MessageCircle className="size-4" aria-hidden="true" />{dict.clientsPage.message}
                    </Link>
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

function ActionButton({ id, action, label, variant }: { id: string; action: string; label: string; variant: "primary" | "secondary" | "danger" }) {
  return (
    <form action={appointmentAction}>
      <input type="hidden" name="appointmentId" value={id} />
      <input type="hidden" name="action" value={action} />
      <SubmitButton variant={variant}>{label}</SubmitButton>
    </form>
  );
}
