import { Suspense } from "react";
import { displayName } from "@/lib/slug";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { currentMarket } from "@/config/market";
import { intlLocale, isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { fill } from "@/lib/format";
import { hoursUntil } from "@/lib/time";
import { getPublicProfile } from "@/lib/profile";
import { buildSlotOptions } from "@/lib/slot-options";
import { SlotPicker } from "@/components/booking/slot-picker";
import { FormAlert } from "@/components/ui/form";
import { PageSkeleton } from "@/components/ui/page-skeleton";

export const metadata: Metadata = { robots: { index: false } };

export default function ReschedulePage(props: PageProps<"/[lang]/account/appointments/[id]/reschedule">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Reschedule {...props} />
    </Suspense>
  );
}

async function Reschedule({ params, searchParams }: PageProps<"/[lang]/account/appointments/[id]/reschedule">) {
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const user = await requireRole(lang, "client", `/${lang}/account/appointments/${id}/reschedule`);
  const sp = await searchParams;

  const a = await db.appointment.findFirst({
    where: { id, clientId: user.id, status: { in: ["pending", "confirmed"] } },
    select: { id: true, kind: true, sessionType: true, startsAt: true, psychologist: { select: { slug: true, cancellationHours: true, user: { select: { name: true } } } } },
  });
  if (!a) notFound();
  const detail = `/${lang}/account/appointments/${a.id}`;
  if (hoursUntil(a.startsAt) < a.psychologist.cancellationHours) redirect(detail);

  const profile = await getPublicProfile(a.psychologist.slug, lang);
  if (!profile) notFound();
  // Same format as the original booking only.
  const key = a.kind === "intro_call" ? `intro:${a.sessionType}` : a.sessionType;
  const options = (await buildSlotOptions(profile, dict, lang)).filter((o) => o.key === key);
  const error = typeof sp.error === "string" && sp.error in dict.booking.errors ? dict.booking.errors[sp.error as keyof typeof dict.booking.errors] : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">{dict.account.rescheduleTitle}</h1>
        <p className="mt-1 text-muted">{fill(dict.account.with, { name: displayName(a.psychologist.user.name, lang) })}</p>
      </div>
      {error && <FormAlert>{error}</FormAlert>}
      <div className="rounded-2xl border border-border bg-surface p-5">
        <SlotPicker
          options={options}
          intlLocale={intlLocale[lang]}
          timeZone={currentMarket.timeZone}
          mode={{ kind: "reschedule", appointmentId: a.id, locale: lang }}
          labels={{
            chooseType: dict.booking.chooseType,
            chooseSlot: dict.booking.chooseSlot,
            noSlots: dict.booking.noSlots,
            more: dict.booking.moreDays,
            earlier: dict.booking.earlierDays,
            tz: dict.booking.timesShownIn,
            confirm: dict.account.reschedule,
          }}
        />
      </div>
      <Link href={detail} className="inline-block text-sm font-medium text-primary hover:underline">← {dict.account.keep}</Link>
    </div>
  );
}
