import { privatePageMetadata } from "@/lib/page-metadata";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/get-dictionary";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { fill, formatShortDate } from "@/lib/format";
import { VerificationCard } from "@/components/admin/verification-card";
import { EmptyState, PageSkeleton } from "@/components/ui/page-skeleton";

export const generateMetadata = privatePageMetadata((d) => d.admin.verifications.title);

export default async function VerificationsPage({ params }: PageProps<"/[lang]/admin/verifications">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Queue locale={lang} dict={dict} />
    </Suspense>
  );
}

async function Queue({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  await requireRole(locale, "admin", `/${locale}/admin/verifications`);
  const t = dict.admin.verifications;

  // Oldest first: people waiting longest get reviewed first.
  const pending = await db.psychologistProfile.findMany({
    where: { verificationStatus: "pending" },
    orderBy: { createdAt: "asc" },
    take: 50,
    select: {
      id: true,
      title: true,
      licenseNumber: true,
      licensingAuthority: true,
      createdAt: true,
      user: { select: { name: true, email: true } },
      documents: { where: { kind: { in: ["license", "identity", "degree"] } }, select: { id: true, kind: true, filename: true } },
      submittedAt: true,
      licenseHistory: { orderBy: { decidedAt: "desc" }, take: 5, select: { id: true, decision: true, licenseNumber: true, note: true, decidedAt: true } },
    },
  });

  return (
    <>
      <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">{t.title}</h1>
      <p className="mt-1 text-sm text-muted">{t.subtitle}</p>
      <div className="mt-6">
        {pending.length ? (
          <ul className="grid gap-4 lg:grid-cols-2">
            {pending.map((p) => (
              <VerificationCard
                key={p.id}
                t={t}
                docs={dict.adminDocs}
                item={{
                  profileId: p.id,
                  name: p.user.name,
                  email: p.user.email,
                  title: dict.titles[p.title],
                  licenseNumber: p.licenseNumber,
                  licensingAuthority: p.licensingAuthority,
                  submitted: fill(t.submitted, { date: formatShortDate(p.submittedAt ?? p.createdAt, locale) }),
                  documents: p.documents.map((d) => ({ id: d.id, label: `${t.docKinds[d.kind as keyof typeof t.docKinds] ?? d.kind} · ${d.filename}` })),
                  history: p.licenseHistory.map((h) =>
                    fill(t.historyLine, { date: formatShortDate(h.decidedAt, locale), decision: t.decisions[h.decision], number: h.licenseNumber }) + (h.note ? ` (${h.note})` : ""),
                  ),
                }}
              />
            ))}
          </ul>
        ) : (
          <EmptyState scene="people" title={t.empty} />
        )}
      </div>
    </>
  );
}
