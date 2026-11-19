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
        <CrisisNotice dict={dict} />
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-sm space-y-3">
            <Logo locale={locale} />
            <p className="text-sm text-muted">{dict.footer.tagline}</p>
          </div>
          <p className="text-sm text-muted">{fill(dict.footer.rights, { year: CURRENT_YEAR, brand: brand.name })}</p>
        </div>
      </div>
    </footer>
  );
}
