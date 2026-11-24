import Link from "next/link";
import { FlaskConical } from "lucide-react";
import { demoSignIn } from "@/actions/demo";
import { demo, DEMO_ROLES } from "@/config/demo";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";

/** Thin strip on every page of the demo: fictional data + one-click roles. */
export function DemoBanner({ locale, t }: { locale: Locale; t: Dictionary["demo"] }) {
  if (!demo.enabled) return null;
  return (
    <div role="note" className="border-b border-primary/20 bg-primary-soft/70 text-sm text-ink">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2 sm:px-6">
        <span className="flex items-center gap-1.5 font-semibold">
          <FlaskConical className="size-4 text-primary" aria-hidden="true" />
          {t.banner}
        </span>
        <Link href={`/${locale}/demo`} className="font-medium text-primary underline-offset-2 hover:underline sm:hidden">
          {t.guideLink}
        </Link>
        <span className="hidden text-muted sm:inline">{t.tryAs}</span>
        <span className="flex flex-wrap gap-1.5">
          {DEMO_ROLES.map((role) => (
            <form key={role} action={demoSignIn}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="role" value={role} />
              <button type="submit" className="rounded-full border border-primary/30 bg-surface px-3 py-0.5 font-medium text-primary hover:border-primary">
                {t.roles[role].label}
              </button>
            </form>
          ))}
        </span>
        <Link href={`/${locale}/demo`} className="ml-auto hidden font-medium text-primary underline-offset-2 hover:underline sm:inline">
          {t.guideLink}
        </Link>
      </div>
    </div>
  );
}
