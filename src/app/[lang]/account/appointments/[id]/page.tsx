import { Suspense } from "react";
import { displayName } from "@/lib/slug";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarPlus, CalendarClock, CheckCircle2, CreditCard, MapPin, MessageCircle, Receipt, Video } from "lucide-react";
import { joinWindow } from "@/lib/video";
import { cancelAction, resumePayment } from "@/actions/booking";
import { brand } from "@/config/brand";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { fill, formatPrice, formatShortDate, formatTime } from "@/lib/format";
import { hoursUntil } from "@/lib/time";
import { SessionTypeIcon } from "@/components/session-type-icon";
import { FeedbackForm } from "@/components/account/feedback-form";
import { RiskSupport } from "@/components/crisis-notice";
import { policy } from "@/config/policy";
import { buttonClass, FormAlert } from "@/components/ui/form";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { SubmitButton } from "@/components/ui/submit-button";

export const metadata: Metadata = { robots: { index: false } };

export default function AppointmentPage(props: PageProps<"/[lang]/account/appointments/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Appointment {...props} />
    </Suspense>
  );
}

async function Appointment({ params, searchParams }: PageProps<"/[lang]/account/appointments/[id]">) {
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const user = await requireRole(lang, "client", `/${lang}/account/appointments/${id}`);
  const sp = await searchParams;

  const a = await db.appointment.findFirst({
    where: { id, clientId: user.id },
    include: {
      payment: true,
      intake: { select: { riskFlag: true } },
      feedback: { select: { id: true } },
      psychologist: {
        select: {
          id: true, slug: true, cancellationHours: true, lateCancellationFeePercent: true,
          user: { select: { name: true } },
          offices: { take: 1, select: { addressLine: true, postalCode: true, city: { select: { translations: { where: { locale: lang } } } } } },
        },
      },
    },
  });
  if (!a) notFound();

  const t = dict.account;
  const p = a.psychologist;
  const name = displayName(p.user.name, lang);
  const hoursLeft = hoursUntil(a.startsAt);
  const active = (a.status === "pending" || a.status === "confirmed") && hoursLeft > 0;
  const late = a.kind === "session" && hoursLeft < p.cancellationHours;
  const deadline = new Date(a.startsAt.getTime() - p.cancellationHours * 3_600_000);
  const fee = Math.round((a.priceCents * p.lateCancellationFeePercent) / 100);
  const format = a.kind === "intro_call" ? dict.booking.introCall : dict.sessionTypes[a.sessionType].label;
  const conversation = await db.conversation.findUnique({
    where: { clientId_psychologistId: { clientId: user.id, psychologistId: p.id } },
    select: { id: true },
  });
  const office = p.offices[0];

  return (
    <div className="space-y-8">
      {sp.booked && (
        <section className="rounded-2xl border border-primary/30 bg-primary-soft p-5" role="status">
          <h1 className="flex items-center gap-2 font-display text-2xl font-semibold text-ink">
            <CheckCircle2 className="size-6 text-primary" aria-hidden="true" />
            {a.status === "pending" ? dict.booking.requestedTitle : dict.booking.confirmedTitle}
          </h1>
          <p className="mt-1 text-ink/80">
            {a.status === "pending"
              ? fill(dict.booking.requestedBody, { name: displayName(p.user.name, lang), email: user.email })
              : fill(dict.booking.confirmedBody, { email: user.email })}
          </p>
        </section>
      )}
      {sp.rescheduled && <FormAlert tone="success">{t.rescheduled}</FormAlert>}
      {sp.paid && (
        <FormAlert tone="success">
          {a.payment?.status === "authorized" || a.status === "pending" ? dict.pay.authorized : dict.pay.paid}{" "}
          {fill(dict.pay.statement, { descriptor: brand.statementDescriptor })}
        </FormAlert>
      )}
      {sp.payment === "cancelled" && a.status === "awaiting_payment" && <FormAlert>{dict.pay.cancelled}</FormAlert>}
      {a.status === "awaiting_payment" && (
        <section className="rounded-2xl border border-primary/30 bg-primary-soft p-5">
          <p className="text-ink">{sp.paid ? dict.pay.redirecting : dict.pay.holdNote}</p>
          <form action={resumePayment} className="mt-3">
            <input type="hidden" name="locale" value={lang} />
            <input type="hidden" name="appointmentId" value={a.id} />
            <SubmitButton>
              <CreditCard className="size-4" aria-hidden="true" />
              {dict.pay.retry}
            </SubmitButton>
          </form>
        </section>
      )}
      {a.intake?.riskFlag && (a.status === "pending" || a.status === "confirmed") && <RiskSupport dict={dict} id="appointment-risk" />}

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        {!sp.booked && <h1 className="font-display text-2xl font-semibold text-ink">{fill(t.with, { name })}</h1>}
        {sp.booked && <h2 className="text-xl font-semibold text-ink">{fill(t.with, { name })}</h2>}
        <dl className="mt-4 space-y-3 text-ink">
          <Row icon={<CalendarClock className="size-5 text-primary" aria-hidden="true" />}>
            {formatShortDate(a.startsAt, lang)}, {formatTime(a.startsAt, lang)}–{formatTime(a.endsAt, lang)}
          </Row>
          <Row icon={<SessionTypeIcon type={a.sessionType} className="size-5 text-primary" />}>{format}</Row>
          {a.sessionType === "in_person" && office && (
            <Row icon={<MapPin className="size-5 text-primary" aria-hidden="true" />}>
              {office.addressLine}, {office.postalCode} {office.city.translations[0]?.name}
            </Row>
          )}
          <Row icon={<Receipt className="size-5 text-primary" aria-hidden="true" />}>
            {a.priceCents === 0 ? dict.booking.free : formatPrice(a.priceCents, lang)}
            {a.payment && <span className="text-muted"> · {t.paymentStatus[a.payment.status]}</span>}
          </Row>
        </dl>
        <p className="mt-4">
          <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium text-ink">
            {a.lateCancellation ? t.lateCancellation : dict.appointmentStatus[a.status]}
          </span>
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {a.status === "confirmed" && a.sessionType !== "in_person" && joinWindow(a.startsAt, a.endsAt).open && (
            <Link href={`/${lang}/session/${a.id}`} className={buttonClass.primary}>
              <Video className="size-4" aria-hidden="true" />
              {dict.apptPage.join}
            </Link>
          )}
          {active && (
            <a href={`/api/appointments/${a.id}/ics`} className={buttonClass.secondary}>
              <CalendarPlus className="size-4" aria-hidden="true" />
              {dict.booking.addToCalendar}
            </a>
          )}
          {conversation && (
            <Link href={`/${lang}/account/messages/${conversation.id}`} className={buttonClass.secondary}>
              <MessageCircle className="size-4" aria-hidden="true" />
              {fill(dict.booking.message, { name: name.split(" ")[0] })}
            </Link>
          )}
          {a.payment?.status === "paid" && (
            <Link href={`/${lang}/account/receipts/${a.payment.id}`} className={buttonClass.secondary}>
              <Receipt className="size-4" aria-hidden="true" />
              {t.viewReceipt}
            </Link>
          )}
        </div>
      </section>

      {active && (
        <section aria-labelledby="manage" className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <h2 id="manage" className="text-lg font-semibold text-ink">{dict.profile.cancellation}</h2>
          <p className="mt-1 text-sm text-muted">
            {late
              ? fill(t.cancelLate, { hours: p.cancellationHours, percent: p.lateCancellationFeePercent, amount: formatPrice(fee, lang) })
              : fill(t.cancelFree, { deadline: `${formatShortDate(deadline, lang)}, ${formatTime(deadline, lang)}` })}
          </p>
          <div className="mt-4 flex flex-wrap items-start gap-2">
            {!late ? (
              <Link href={`/${lang}/account/appointments/${a.id}/reschedule`} className={buttonClass.secondary}>
                {t.reschedule}
              </Link>
            ) : (
              <p className="w-full text-sm text-muted">{fill(t.rescheduleTooLate, { hours: p.cancellationHours })}</p>
            )}
            {/* Two-step cancel without JavaScript: open, then confirm. */}
            <details className="group">
              <summary className={`${buttonClass.danger} cursor-pointer list-none`}>{t.cancel}</summary>
              <div className="mt-3 rounded-xl border border-accent/30 bg-accent-soft p-4">
                <p className="font-medium text-ink">{t.cancelTitle}</p>
                <form action={cancelAction} className="mt-3 flex flex-wrap gap-2">
                  <input type="hidden" name="appointmentId" value={a.id} />
                  <input type="hidden" name="locale" value={lang} />
                  <SubmitButton variant="danger">{t.confirmCancel}</SubmitButton>
                </form>
              </div>
            </details>
          </div>
        </section>
      )}

      {a.status === "completed" && a.kind === "session" && (
        <section id="feedback" aria-labelledby="feedback-title" className="scroll-mt-24 rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <h2 id="feedback-title" className="text-lg font-semibold text-ink">{fill(t.feedbackTitle, { name })}</h2>
          <div className="mt-3">
            {a.feedback ? <p className="text-muted">{t.feedbackGiven}</p> : <FeedbackForm appointmentId={a.id} locale={lang} t={t} allowPublic={policy.publicTestimonials} />}
          </div>
        </section>
      )}

      <Link href={`/${lang}/account`} className="inline-block text-sm font-medium text-primary hover:underline">
        ← {dict.booking.goToAccount}
      </Link>
    </div>
  );
}

function Row({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <dt className="mt-0.5">{icon}</dt>
      <dd>{children}</dd>
    </div>
  );
}
