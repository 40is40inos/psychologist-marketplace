import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { CrisisLines } from "@/components/crisis-notice";
import { buttonClass } from "@/components/ui/form";

export async function generateMetadata({ params }: PageProps<"/[lang]/urgent-help">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return {
    title: dict.urgentHelp.title,
    description: dict.urgentHelp.intro,
    alternates: { canonical: `/${lang}/urgent-help`, languages: Object.fromEntries(locales.map((l) => [l, `/${l}/urgent-help`])) },
  };
}

/** Static, fast page: no database, no sign-in, works on poor connections. */
export default async function UrgentHelpPage({ params }: PageProps<"/[lang]/urgent-help">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const t = dict.urgentHelp;

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 py-10 sm:px-6 sm:py-14">
      <header className="space-y-3">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{t.title}</h1>
        <p className="text-lg text-ink">{t.intro}</p>
      </header>

      <CrisisLines dict={dict} size="lg" />

      <p className="rounded-2xl bg-surface-muted p-4 text-ink">{t.notEmergency}</p>

      <section aria-labelledby="steps" className="space-y-3">
        <h2 id="steps" className="text-xl font-semibold text-ink">{t.stepsTitle}</h2>
        <ol className="list-decimal space-y-2 pl-6 text-ink">
          {t.steps.map((s) => <li key={s}>{s}</li>)}
        </ol>
      </section>

      <section aria-labelledby="other" className="space-y-2">
        <h2 id="other" className="text-xl font-semibold text-ink">{t.otherTitle}</h2>
        <p className="text-ink">{t.otherBody}</p>
      </section>

      <section aria-labelledby="later" className="space-y-3 border-t border-border pt-8">
        <h2 id="later" className="text-xl font-semibold text-ink">{t.laterTitle}</h2>
        <p className="text-ink">{t.laterBody}</p>
        <Link href={`/${lang}/psychologists`} className={buttonClass.secondary}>{t.find}</Link>
      </section>
    </div>
  );
}
