import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { earliestSlots } from "@/lib/availability";
import { toCard } from "@/lib/search";
import { PsychologistCard } from "@/components/psychologist-card";
import { SaveButton } from "@/components/save-button";
import { EmptyState, PageSkeleton } from "@/components/ui/page-skeleton";

export const metadata: Metadata = { robots: { index: false } };

export default function Page({ params }: PageProps<"/[lang]/account/saved">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/[lang]/account/saved">["params"] }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const [dict, user] = await Promise.all([getDictionary(lang), requireRole(lang, "client", `/${lang}/account/saved`)]);

  const saved = await db.savedPsychologist.findMany({
    where: { userId: user.id, psychologist: { verificationStatus: "verified", published: true } },
    orderBy: { createdAt: "desc" },
    select: {
      psychologist: {
        select: {
          id: true, slug: true, title: true, photoUrl: true, practisingSince: true, sessionLanguages: true,
          introCallEnabled: true, bookingNoticeHours: true, bookingWindowDays: true,
          user: { select: { name: true } },
          translations: { select: { locale: true, headline: true } },
          offerings: { where: { active: true }, select: { type: true, durationMinutes: true, priceCents: true } },
          offices: { take: 1, select: { latitude: true, longitude: true, city: { select: { slug: true, translations: { select: { locale: true, name: true } } } } } },
          specialties: { select: { specialty: { select: { slug: true, kind: true } } } },
        },
      },
    },
  });
  const rows = saved.map((s) => s.psychologist);
  const earliest = await earliestSlots(rows.map((r) => ({ id: r.id, bookingNoticeHours: r.bookingNoticeHours, bookingWindowDays: r.bookingWindowDays, minDuration: 50 })));
  const path = `/${lang}/account/saved`;

  return (
    <>
      <h1 className="font-display text-2xl font-semibold text-ink">{dict.account.savedTitle}</h1>
      <div className="mt-6">
        {rows.length === 0 ? (
          <EmptyState title={dict.account.savedEmpty} />
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {rows.map((r) => (
              <li key={r.id}>
                <PsychologistCard
                  card={{ ...toCard(r, lang, dict.titles), nextAvailable: earliest.get(r.id) ?? null }}
                  locale={lang}
                  dict={dict}
                  footer={<SaveButton slug={r.slug} saved locale={lang} returnTo={path} labels={{ save: dict.profile.save, saved: dict.profile.saved }} />}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
