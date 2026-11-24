import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Briefcase, ExternalLink, ShieldCheck, Stethoscope, UserRound } from "lucide-react";
import { demoSignIn } from "@/actions/demo";
import { brand } from "@/config/brand";
import { demo, DEMO_ROLES, type DemoRole } from "@/config/demo";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { fill } from "@/lib/format";
import { buttonClass } from "@/components/ui/form";

export const metadata: Metadata = { robots: { index: false } };

const ICONS: Record<DemoRole, typeof UserRound> = { client: UserRound, psychologist: Stethoscope, admin: ShieldCheck };

/** Demo guide: what the product is and what to try, for first-time visitors and recruiters. */
export default async function DemoPage({ params }: PageProps<"/[lang]/demo">) {
  const { lang } = await params;
  if (!isLocale(lang) || !demo.enabled) notFound();
  const t = (await getDictionary(lang)).demo;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="text-sm font-semibold uppercase tracking-wide text-primary">{t.eyebrow}</p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{fill(t.title, { brand: brand.name })}</h1>
      <p className="mt-4 max-w-2xl text-lg text-ink">{t.intro}</p>
      <p className="mt-3 max-w-2xl text-sm text-muted">{t.fictional}</p>

      <h2 className="mt-12 font-display text-2xl font-semibold text-ink">{t.tryTitle}</h2>
      <p className="mt-1 text-muted">{t.tryIntro}</p>
      <ul className="mt-6 grid gap-4 md:grid-cols-3">
        {DEMO_ROLES.map((role) => {
          const r = t.roles[role];
          const Icon = ICONS[role];
          return (
            <li key={role} className="flex flex-col rounded-2xl border border-border bg-surface p-5">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-ink">
                <Icon className="size-5 text-primary" aria-hidden="true" />
                {r.title}
              </h3>
              <p className="mt-1 text-sm text-muted">{r.who}</p>
              <ul className="mt-4 flex-1 list-disc space-y-1.5 pl-5 text-sm text-ink">
                {r.steps.map((s) => <li key={s}>{s}</li>)}
              </ul>
              <form action={demoSignIn} className="mt-5">
                <input type="hidden" name="locale" value={lang} />
                <input type="hidden" name="role" value={role} />
                <button type="submit" className={`${buttonClass.primary} w-full`}>{r.cta}</button>
              </form>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-sm text-muted">
        {t.orBrowse}{" "}
        <Link href={`/${lang}/psychologists`} className="font-medium text-primary hover:underline">{t.browseLink}</Link>
        {" · "}
        <Link href={`/${lang}/match`} className="font-medium text-primary hover:underline">{t.matchLink}</Link>
      </p>

      <h2 className="mt-12 font-display text-2xl font-semibold text-ink">{t.highlightsTitle}</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {t.highlights.map((h) => (
          <li key={h.title} className="rounded-2xl border border-border bg-surface p-4">
            <p className="font-semibold text-ink">{h.title}</p>
            <p className="mt-1 text-sm text-muted">{h.text}</p>
          </li>
        ))}
      </ul>

      <h2 className="mt-12 flex items-center gap-2 font-display text-2xl font-semibold text-ink">
        <Briefcase className="size-6 text-primary" aria-hidden="true" />
        {t.stackTitle}
      </h2>
      <ul className="mt-4 flex flex-wrap gap-2">
        {t.stack.map((s) => <li key={s} className="rounded-full border border-border bg-surface px-3 py-1 text-sm text-ink">{s}</li>)}
      </ul>
      {demo.sourceUrl && (
        <a href={demo.sourceUrl} target="_blank" rel="noreferrer" className={`${buttonClass.secondary} mt-6`}>
          <ExternalLink className="size-4" aria-hidden="true" />
          {t.source}
        </a>
      )}
      <p className="mt-8 text-sm text-muted">{t.limits}</p>
    </div>
  );
}
