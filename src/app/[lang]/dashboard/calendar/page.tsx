import { privatePageMetadata } from "@/lib/page-metadata";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { randomBytes } from "node:crypto";
import { CalendarSync, Lock, RefreshCw, Trash2 } from "lucide-react";
import { addException, connectCalendar, disconnectCalendar, removeException, resetFeedToken, saveBookingRules, syncCalendarNow } from "@/actions/calendar";
import { brand } from "@/config/brand";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/get-dictionary";
import { db } from "@/lib/db";
import { fill, formatShortDate, formatTime } from "@/lib/format";
import { hasFeature, listPlans } from "@/lib/plans";
import { requirePsychologist } from "@/lib/workspace";
import { WeeklyHours, type Range } from "@/components/calendar/weekly-hours";
import { ActionForm } from "@/components/ui/action-form";
import { CopyField } from "@/components/ui/copy-field";
import { Field, inputClass, buttonClass } from "@/components/ui/form";
import { PageSkeleton } from "@/components/ui/page-skeleton";

export const generateMetadata = privatePageMetadata((d) => d.calendarPage.title);

export default async function CalendarPage({ params }: PageProps<"/[lang]/dashboard/calendar">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Calendar locale={lang} dict={dict} />
    </Suspense>
  );
}

const hm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

async function Calendar({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const { profileId } = await requirePsychologist(locale, `/${locale}/dashboard/calendar`);
  const t = dict.calendarPage;
  const now = new Date();

  let profile = await db.psychologistProfile.findUniqueOrThrow({
    where: { id: profileId },
    include: {
      availability: { orderBy: [{ weekday: "asc" }, { startMinute: "asc" }] },
      exceptions: { where: { endsAt: { gte: now } }, orderBy: { startsAt: "asc" } },
      calendars: { include: { _count: { select: { busy: true } } } },
    },
  });
  // Every psychologist gets a feed address the first time they open this page.
  if (!profile.calendarFeedToken) {
    profile = await db.psychologistProfile.update({
      where: { id: profileId },
      data: { calendarFeedToken: randomBytes(24).toString("base64url") },
      include: { availability: { orderBy: [{ weekday: "asc" }, { startMinute: "asc" }] }, exceptions: { where: { endsAt: { gte: now } }, orderBy: { startsAt: "asc" } }, calendars: { include: { _count: { select: { busy: true } } } } },
    });
  }
  const canSync = await hasFeature(profileId, "calendar_sync");
  const syncPlan = canSync ? null : (await listPlans(locale)).find((p) => p.features.includes("calendar_sync"));
  const feedUrl = `${brand.siteUrl}/api/calendar/${profile.calendarFeedToken}`;
  const initial: Range[] = profile.availability.map((r) => ({ weekday: r.weekday, start: hm(r.startMinute), end: hm(r.endMinute), types: r.sessionTypes }));
  const errors = { invalid: dict.workspace.saveError, range: t.invalidRange, url: t.invalidUrl, sync: t.syncError, locked: fill(dict.workspace.featureLocked, { plan: syncPlan?.name ?? "Pro" }) };

  return (
    <div className="space-y-10">
      <h1 className="font-display text-2xl font-semibold text-ink">{t.title}</h1>

      <section aria-labelledby="weekly" className="space-y-3">
        <div>
          <h2 id="weekly" className="text-lg font-semibold text-ink">{t.weekly}</h2>
          <p className="text-sm text-muted">{t.weeklyHint}</p>
        </div>
        <WeeklyHours
          initial={initial}
          t={{ ...t, save: dict.workspace.save }}
          typeLabels={{ in_person: dict.sessionTypes.in_person.short, video: dict.sessionTypes.video.short, phone: dict.sessionTypes.phone.short }}
          savedLabel={dict.workspace.saved}
          errorLabels={{ invalid: dict.workspace.saveError, range: t.invalidRange }}
        />
      </section>

      <section aria-labelledby="rules" className="space-y-3">
        <h2 id="rules" className="text-lg font-semibold text-ink">{t.settings}</h2>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <ActionForm action={saveBookingRules} submitLabel={dict.workspace.save} savedLabel={dict.workspace.saved} errors={errors}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field id="bufferMinutes" label={t.buffer}><input id="bufferMinutes" name="bufferMinutes" type="number" min={0} max={60} defaultValue={profile.bufferMinutes} className={inputClass} /></Field>
              <Field id="bookingNoticeHours" label={t.notice}><input id="bookingNoticeHours" name="bookingNoticeHours" type="number" min={0} max={168} defaultValue={profile.bookingNoticeHours} className={inputClass} /></Field>
              <Field id="bookingWindowDays" label={t.window}><input id="bookingWindowDays" name="bookingWindowDays" type="number" min={7} max={180} defaultValue={profile.bookingWindowDays} className={inputClass} /></Field>
              <Field id="cancellationHours" label={t.cancellation}><input id="cancellationHours" name="cancellationHours" type="number" min={0} max={168} defaultValue={profile.cancellationHours} className={inputClass} /></Field>
              <Field id="lateCancellationFeePercent" label={t.lateFee}><input id="lateCancellationFeePercent" name="lateCancellationFeePercent" type="number" min={0} max={100} defaultValue={profile.lateCancellationFeePercent} className={inputClass} /></Field>
            </div>
            <label className="flex gap-3 rounded-xl border border-border p-4">
              <input type="checkbox" name="requiresApproval" defaultChecked={profile.requiresApproval} className="mt-0.5 size-5 shrink-0 accent-[var(--primary)]" />
              <span>
                <span className="block font-medium text-ink">{t.approval}</span>
                <span className="block text-sm text-muted">{t.approvalHint}</span>
              </span>
            </label>
          </ActionForm>
        </div>
      </section>

      <section aria-labelledby="timeoff" className="space-y-3">
        <div>
          <h2 id="timeoff" className="text-lg font-semibold text-ink">{t.timeOff}</h2>
          <p className="text-sm text-muted">{t.timeOffHint}</p>
        </div>
        {profile.exceptions.length ? (
          <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
            {profile.exceptions.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 p-4 text-sm">
                <span className="text-ink">
                  <span className={`mr-2 rounded-full px-2 py-0.5 text-xs font-medium ${o.kind === "available" ? "bg-primary-soft text-primary" : "bg-surface-muted text-muted"}`}>{t.exceptionKinds[o.kind]}</span>
                  {formatShortDate(o.startsAt, locale)} {formatTime(o.startsAt, locale)} – {formatShortDate(o.endsAt, locale)} {formatTime(o.endsAt, locale)}
                  {o.note && <span className="text-muted"> · {o.note}</span>}
                </span>
                <form action={removeException}>
                  <input type="hidden" name="id" value={o.id} />
                  <button type="submit" aria-label={t.removeRange} className="grid size-9 place-items-center rounded-lg text-muted hover:text-accent"><Trash2 className="size-4" aria-hidden="true" /></button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">{t.noTimeOff}</p>
        )}
        <div className="rounded-2xl border border-border bg-surface p-5">
          <ActionForm action={addException} submitLabel={t.addTimeOff} errors={errors} variant="secondary" resetOnSuccess>
            <fieldset className="mb-4">
              <legend className="mb-2 text-sm font-medium text-ink">{t.exceptionKind}</legend>
              <div className="flex flex-wrap gap-2">
                {(["unavailable", "available"] as const).map((k) => (
                  <label key={k} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-border bg-surface px-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary-soft/50">
                    <input type="radio" name="kind" value={k} defaultChecked={k === "unavailable"} className="size-4 accent-[var(--primary)]" />
                    {t.exceptionKinds[k]}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field id="start" label={t.start}><input id="start" name="start" type="datetime-local" required className={inputClass} /></Field>
              <Field id="end" label={t.end}><input id="end" name="end" type="datetime-local" required className={inputClass} /></Field>
              <Field id="note" label={t.note}><input id="note" name="note" maxLength={200} className={inputClass} /></Field>
            </div>
          </ActionForm>
        </div>
      </section>

      <section aria-labelledby="sync" className="space-y-3">
        <div>
          <h2 id="sync" className="flex items-center gap-2 text-lg font-semibold text-ink"><CalendarSync className="size-5 text-primary" aria-hidden="true" />{t.sync}</h2>
          <p className="text-sm text-muted">{t.syncHint}</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 space-y-3">
          <h3 className="font-semibold text-ink">{t.exportTitle}</h3>
          <p className="text-sm text-muted">{t.exportHint}</p>
          <CopyField value={feedUrl} label={t.exportTitle} copyLabel={t.copy} copiedLabel={t.copied} />
          <form action={resetFeedToken}><button type="submit" className="text-sm font-medium text-muted hover:text-ink hover:underline">{t.resetFeed}</button></form>
        </div>

        {canSync ? (
          <div className="space-y-3 rounded-2xl border border-border bg-surface p-5">
            {profile.calendars.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-muted/60 p-3 text-sm">
                <div>
                  <p className="font-medium text-ink">{c.label}</p>
                  <p className="text-muted">
                    {c.lastSyncedAt ? fill(t.lastSynced, { date: `${formatShortDate(c.lastSyncedAt, locale)} ${formatTime(c.lastSyncedAt, locale)}` }) : t.neverSynced}
                    {" · "}{fill(t.events, { count: c._count.busy })}
                  </p>
                  {c.lastError && <p className="text-accent">{fill(t.syncError, { error: c.lastError })}</p>}
                </div>
                <div className="flex gap-2">
                  <form action={syncCalendarNow}><input type="hidden" name="id" value={c.id} /><button type="submit" className={buttonClass.secondary}><RefreshCw className="size-4" aria-hidden="true" />{t.syncNow}</button></form>
                  <form action={disconnectCalendar}><input type="hidden" name="id" value={c.id} /><button type="submit" className={buttonClass.danger}>{t.disconnect}</button></form>
                </div>
              </div>
            ))}
            <ActionForm action={connectCalendar} submitLabel={t.connect} errors={errors} variant="secondary">
              <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
                <Field id="label" label={t.importLabel}><input id="label" name="label" defaultValue="Google" maxLength={60} className={inputClass} /></Field>
                <Field id="url" label={t.importUrl} hint={t.importHint}><input id="url" name="url" type="url" required placeholder="https://calendar.google.com/calendar/ical/…/basic.ics" className={inputClass} aria-describedby="url-hint" /></Field>
              </div>
            </ActionForm>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-border bg-surface p-5">
            <p className="flex items-center gap-2 text-sm text-ink"><Lock className="size-4 text-muted" aria-hidden="true" />{errors.locked}</p>
            <Link href={`/${locale}/dashboard/plan`} className={buttonClass.secondary}>{dict.workspace.upgrade}</Link>
          </div>
        )}
      </section>
    </div>
  );
}
