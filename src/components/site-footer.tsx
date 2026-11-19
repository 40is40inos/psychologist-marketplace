import Link from "next/link";
import { brand } from "@/config/brand";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { CURRENT_YEAR, fill } from "@/lib/format";
import { CrisisNotice } from "./crisis-notice";
import { Logo } from "./logo";

export function SiteFooter({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <footer className="mt-auto print:hidden border-t border-border bg-surface-muted">
      <div className="mx-auto max-w-6xl space-y-10 px-4 py-12 sm:px-6">
        <CrisisNotice dict={dict} locale={locale} />
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-sm space-y-3">
            <Logo locale={locale} />
            <p className="text-sm text-muted">{dict.footer.tagline}</p>
          </div>
          <nav aria-label={dict.footer.legal} className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {[
              [`/${locale}/blog`, dict.nav.blog],
              [`/${locale}/p/about`, dict.footer.about],
              [`/${locale}/p/privacy`, dict.footer.privacy],
              [`/${locale}/p/terms`, dict.footer.terms],
              [`/${locale}/p/cookies`, dict.footer.cookies],
            ].map(([href, label]) => (
              <Link key={href} href={href} className="text-muted hover:text-ink hover:underline">{label}</Link>
            ))}
          </nav>
        </div>
        <div>
          <p className="text-sm text-muted">{fill(dict.footer.rights, { year: CURRENT_YEAR, brand: brand.name })}</p>
        </div>
      </div>
    </footer>
  );
}
