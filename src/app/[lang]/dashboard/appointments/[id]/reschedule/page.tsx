import { privatePageMetadata } from "@/lib/page-metadata";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { currentMarket } from "@/config/market";
import { intlLocale, isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { db } from "@/lib/db";
import { getPublicProfile } from "@/lib/profile";
import { buildSlotOptions } from "@/lib/slot-options";
import { requirePsychologist } from "@/lib/workspace";
import { SlotPicker } from "@/components/booking/slot-picker";
import { FormAlert } from "@/components/ui/form";
import { PageSkeleton } from "@/components/ui/page-skeleton";

export const generateMetadata = privatePageMetadata((d) => d.apptPage.rescheduleTitle);

export default function Page(props: PageProps<"/[lang]/dashboard/appointments/[id]/reschedule">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content {...props} />
    </Suspense>
  );
}

async function Content({ params, searchParams }: PageProps<"/[lang]/dashboard/appointments/[id]/reschedule">) {
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const { profileId } = await requirePsychologist(lang, `/${lang}/dashboard/appointments/${id}/reschedule`);
  const sp = await searchParams;
  const a = await db.appointment.findFirst({
    where: { id, psychologistId: profileId, status: { in: ["pending", "confirmed"] } },
    select: { id: true, kind: true, sessionType: true, client: { select: { name: true } }, psychologist: { select: { slug: true } } },
  });
  if (!a) notFound();
  const profile = await getPublicProfile(a.psychologist.slug, lang);
  if (!profile) notFound();
  const key = a.kind === "intro_call" ? `intro:${a.sessionType}` : a.sessionType;
  const options = (await buildSlotOptions(profile, dict, lang)).filter((o) => o.key === key);
  const error = typeof sp.error === "string" && sp.error in dict.booking.errors ? dict.booking.errors[sp.error as keyof typeof dict.booking.errors] : null;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">{dict.apptPage.rescheduleTitle}</h1>
        <p className="mt-1 text-muted">{a.client.name}</p>
      </div>
      {error && <FormAlert>{error}</FormAlert>}
      <div className="rounded-2xl border border-border bg-surface p-5">
        <SlotPicker
          options={options}
          intlLocale={intlLocale[lang]}
          timeZone={currentMarket.timeZone}
          mode={{ kind: "reschedule", appointmentId: a.id, locale: lang, actor: "psychologist" }}
          labels={{ chooseType: dict.booking.chooseType, chooseSlot: dict.booking.chooseSlot, noSlots: dict.booking.noSlots, more: dict.booking.moreDays, earlier: dict.booking.earlierDays, tz: dict.booking.timesShownIn, confirm: dict.apptPage.reschedule }}
        />
      </div>
      <Link href={`/${lang}/dashboard/appointments`} className="inline-block text-sm font-medium text-primary hover:underline">← {dict.apptPage.title}</Link>
    </div>
  );
}
