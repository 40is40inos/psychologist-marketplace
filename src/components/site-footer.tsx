import Link from "next/link";
import { brand } from "@/config/brand";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { CURRENT_YEAR, fill } from "@/lib/format";
import { CITY_PREFIX, seoCities, seoConcerns } from "@/lib/seo-pages";
import { CrisisNotice } from "./crisis-notice";
import { Logo } from "./logo";

export async function SiteFooter({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const [concerns, cities] = await Promise.all([seoConcerns(locale), seoCities(locale)]);
  const l = (path: string) => `/${locale}${path}`;
  const columns: { title: string; links: [string, string][] }[] = [
    {
      title: dict.footer.platform,
      links: [
        [l("/psychologists"), dict.nav.findPsychologist],
        [l("/match"), dict.match.cta],
        [l("/for-psychologists"), dict.footerX.forPsychologists],
        [l("/blog"), dict.nav.blog],
      ],
    },
    {
      title: dict.footer.company,
      links: [
        [l("/p/about"), dict.footer.about],
        [l("/faq"), dict.footerX.faq],
        [l("/contact"), dict.footer.contact],
        [l("/urgent-help"), dict.footerX.urgentHelp],
      ],
    },
    {
      title: dict.footer.legal,
      links: [
        [l("/p/privacy"), dict.footer.privacy],
        [l("/p/terms"), dict.footer.terms],
        [l("/p/cancellation-policy"), dict.legal.footerCancellation],
        [l("/p/terms-psychologists"), dict.legal.footerPsychologistTerms],
        [l("/p/cookies"), dict.footer.cookies],
      ],
    },
  ];

  return (
    <footer className="mt-auto print:hidden border-t border-border bg-surface-muted">
      <div className="mx-auto max-w-6xl space-y-10 px-4 py-12 sm:px-6">
        <CrisisNotice dict={dict} locale={locale} />

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3">
            <Logo locale={locale} />
            <p className="max-w-xs text-sm text-muted">{dict.footer.tagline}</p>
          </div>
          {columns.map((c) => (
            <nav key={c.title} aria-label={c.title}>
              <h2 className="text-sm font-semibold text-ink">{c.title}</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {c.links.map(([href, label]) => (
                  <li key={href}><Link href={href} className="text-muted hover:text-ink hover:underline">{label}</Link></li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {(concerns.length > 0 || cities.length > 0) && (
          <div className="grid gap-6 border-t border-border pt-8 sm:grid-cols-[2fr_1fr]">
            {concerns.length > 0 && (
              <nav aria-label={dict.footerX.concerns}>
                <h2 className="text-sm font-semibold text-ink">{dict.footerX.concerns}</h2>
                <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
                  {concerns.map((c) => (
                    <li key={c.slug}><Link href={l(`/${c.slug}`)} className="text-muted hover:text-ink hover:underline">{c.label}</Link></li>
                  ))}
                </ul>
              </nav>
            )}
            {cities.length > 0 && (
              <nav aria-label={dict.footerX.cities}>
                <h2 className="text-sm font-semibold text-ink">{dict.footerX.cities}</h2>
                <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
                  {cities.map((c) => (
                    <li key={c.slug}><Link href={l(`/${CITY_PREFIX}${c.slug}`)} className="text-muted hover:text-ink hover:underline">{c.name}</Link></li>
                  ))}
                </ul>
              </nav>
            )}
          </div>
        )}

        <p className="text-sm text-muted">{fill(dict.footer.rights, { year: CURRENT_YEAR, brand: brand.name })}</p>
      </div>
    </footer>
  );
}
