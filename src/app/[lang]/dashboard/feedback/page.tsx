import { privatePageMetadata } from "@/lib/page-metadata";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Lock, Star } from "lucide-react";
import { intlLocale, isLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/get-dictionary";
import { db } from "@/lib/db";
import { fill } from "@/lib/format";
import { requirePsychologist } from "@/lib/workspace";
import { EmptyState, PageSkeleton } from "@/components/ui/page-skeleton";

export const generateMetadata = privatePageMetadata((d) => d.feedbackPage.title);

export default async function FeedbackPage({ params }: PageProps<"/[lang]/dashboard/feedback">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Feedback locale={lang} dict={dict} />
    </Suspense>
  );
}

/** Private feedback, without client names, so it stays honest. */
async function Feedback({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const { profileId } = await requirePsychologist(locale, `/${locale}/dashboard/feedback`);
  const t = dict.feedbackPage;
  const items = await db.feedback.findMany({
    where: { psychologistId: profileId, moderationStatus: { not: "rejected" } },
    orderBy: { createdAt: "desc" },
    take: 100,
    // Deliberately no client fields. Only the month is shown, not the session date.
    select: { id: true, rating: true, comment: true, createdAt: true },
  });
  const avg = items.length ? items.reduce((s, f) => s + f.rating, 0) / items.length : 0;
  const month = new Intl.DateTimeFormat(intlLocale[locale], { month: "long", year: "numeric" });

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">{t.title}</h1>
        <p className="mt-1 flex gap-2 text-sm text-muted"><Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{t.hint}</p>
      </div>
      {items.length === 0 ? (
        <EmptyState scene="messages" title={t.empty} />
      ) : (
        <>
          <p className="text-ink">{fill(t.average, { rating: avg.toLocaleString(intlLocale[locale], { maximumFractionDigits: 1 }), count: items.length })}</p>
          <ul className="space-y-3">
            {items.map((f) => (
              <li key={f.id} className="rounded-2xl border border-border bg-surface p-4">
                <p className="flex items-center gap-0.5" aria-label={`${f.rating}/5`}>
                  {Array.from({ length: 5 }, (_, i) => <Star key={i} className={`size-4 ${i < f.rating ? "fill-current text-primary" : "text-border"}`} aria-hidden="true" />)}
                </p>
                {f.comment && <p className="mt-2 whitespace-pre-line text-ink">{f.comment}</p>}
                <p className="mt-2 text-xs text-muted">{t.anonymous} · {month.format(f.createdAt)}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

