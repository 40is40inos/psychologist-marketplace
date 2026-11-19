import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock, Star } from "lucide-react";
import { moderateReview } from "@/actions/admin-x";
import { policy } from "@/config/policy";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/get-dictionary";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { fill, formatShortDate } from "@/lib/format";
import { inputClass } from "@/components/ui/form";
import { EmptyState, PageSkeleton } from "@/components/ui/page-skeleton";
import { SubmitButton } from "@/components/ui/submit-button";

type Tab = "pending" | "approved" | "rejected";

export default async function AdminReviewsPage({ params, searchParams }: PageProps<"/[lang]/admin/reviews">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Reviews locale={lang} dict={dict} searchParams={searchParams} />
    </Suspense>
  );
}

async function Reviews({ locale, dict, searchParams }: { locale: Locale; dict: Dictionary; searchParams: PageProps<"/[lang]/admin/reviews">["searchParams"] }) {
  await requireRole(locale, "admin", `/${locale}/admin/reviews`);
  const t = dict.adminX.reviews;
  const sp = await searchParams;
  const tab: Tab = sp.tab === "approved" || sp.tab === "rejected" ? sp.tab : "pending";
  const [items, counts] = await Promise.all([
    db.feedback.findMany({
      where: { moderationStatus: tab },
      // Consented feedback first: only those can be published.
      orderBy: [{ publicConsent: "desc" }, { createdAt: "desc" }],
      take: 100,
      include: {
        client: { select: { name: true } },
        psychologist: { select: { user: { select: { name: true } } } },
        appointment: { select: { startsAt: true } },
      },
    }),
    db.feedback.groupBy({ by: ["moderationStatus"], _count: true }),
  ]);
  const count = (s: Tab) => counts.find((c) => c.moderationStatus === s)?._count ?? 0;
  const base = `/${locale}/admin/reviews`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">{t.title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted">{t.hint}</p>
      </div>
      <div className="inline-flex rounded-xl border border-border p-1" role="tablist">
        {(["pending", "approved", "rejected"] as const).map((k) => (
          <Link key={k} href={`${base}?tab=${k}`} role="tab" aria-selected={tab === k} className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium ${tab === k ? "bg-primary-soft text-primary" : "text-muted hover:text-ink"}`}>
            {t.tabs[k]} <span className="text-xs">({count(k)})</span>
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <EmptyState title={t.empty} />
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {items.map((f) => (
            <li key={f.id} className="rounded-2xl border border-border bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-ink">{fill(t.session, { date: formatShortDate(f.appointment.startsAt, locale), psychologist: f.psychologist.user.name })}</p>
                  <p className="text-sm text-muted">{fill(t.by, { client: f.client.name })} · {formatShortDate(f.createdAt, locale)}</p>
                </div>
                <p className="flex items-center gap-0.5" aria-label={`${f.rating}/5`}>
                  {Array.from({ length: 5 }, (_, i) => <Star key={i} className={`size-4 ${i < f.rating ? "fill-current text-primary" : "text-border"}`} aria-hidden="true" />)}
                </p>
              </div>
              {f.comment && <p className="mt-3 whitespace-pre-line rounded-xl bg-surface-muted/60 p-3 text-sm text-ink">{f.comment}</p>}
              {policy.publicTestimonials && (
                <p className={`mt-3 flex items-center gap-1.5 text-xs font-medium ${f.publicConsent ? "text-primary" : "text-muted"}`}>
                  {!f.publicConsent && <Lock className="size-3.5" aria-hidden="true" />}
                  {f.publicConsent ? t.consent : t.noConsent}
                </p>
              )}
              {f.moderationNote && <p className="mt-1 text-xs text-muted">{t.note}: {f.moderationNote}</p>}
              <form action={moderateReview} className="mt-4 flex flex-wrap items-end gap-2">
                <input type="hidden" name="id" value={f.id} />
                <label className="block min-w-48 flex-1">
                  <span className="mb-1 block text-xs text-muted">{t.note}</span>
                  <input name="note" maxLength={300} defaultValue={f.moderationNote ?? ""} className={inputClass} />
                </label>
                {tab !== "approved" && <SubmitButton name="decision" value="approved">{t.approve}</SubmitButton>}
                {tab !== "rejected" && <SubmitButton name="decision" value="rejected" variant="danger">{t.reject}</SubmitButton>}
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
