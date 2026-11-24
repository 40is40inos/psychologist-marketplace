import { Suspense } from "react";
import Link from "next/link";
import { LifeBuoy, Menu, X } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { LanguageSwitcher, LanguageSwitcherFallback } from "./language-switcher";
import { Logo } from "./logo";
import { UserMenu } from "./user-menu";

export function SiteHeader({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const links = [
    { href: `/${locale}/psychologists`, label: dict.nav.findPsychologist },
    { href: `/${locale}/match`, label: dict.match.cta },
    { href: `/${locale}#how-it-works`, label: dict.nav.howItWorks },
    { href: `/${locale}/for-psychologists`, label: dict.nav.forPsychologists },
  ];

  return (
    <header className="sticky top-0 z-30 print:hidden border-b border-border bg-bg/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:gap-4 sm:px-6">
        <div className="min-w-0 flex-1 lg:flex-none">
          <Logo locale={locale} />
        </div>

        <nav aria-label={dict.a11y.mainNav} className="hidden items-center gap-6 lg:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm font-medium text-muted transition-colors hover:text-ink">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-0.5 sm:gap-2">
          {/* Always reachable, but quiet: an icon on phones, short text on wider screens. */}
          <Link
            href={`/${locale}/urgent-help`}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg px-1.5 text-sm font-medium text-accent hover:bg-accent-soft sm:px-2"
          >
            <LifeBuoy className="size-4" aria-hidden="true" />
            <span className="sr-only lg:not-sr-only">{dict.urgentHelp.link}</span>
          </Link>
          {/* The switcher reads the URL, so it streams in; the fallback links to each home page. */}
          <Suspense fallback={<LanguageSwitcherFallback current={locale} label={dict.a11y.changeLanguage} />}>
            <LanguageSwitcher current={locale} label={dict.a11y.changeLanguage} />
          </Suspense>
          <Suspense fallback={<div className="h-10 w-16" />}>
            <UserMenu locale={locale} dict={dict} />
          </Suspense>

          {/* Mobile menu: a native disclosure, so it works without JavaScript. */}
          <details className="group relative lg:hidden">
            <summary
              className="grid size-10 cursor-pointer place-items-center rounded-lg text-ink hover:bg-surface-muted sm:size-11"
              aria-label={dict.a11y.openMenu}
            >
              <Menu className="size-5 group-open:hidden" aria-hidden="true" />
              <X className="hidden size-5 group-open:block" aria-hidden="true" />
            </summary>
            <nav
              aria-label={dict.a11y.mainNav}
              className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-border bg-surface p-2 shadow-lg"
            >
              {links.map((link) => (
                <Link key={link.href} href={link.href} className="block rounded-lg px-3 py-3 text-base font-medium text-ink hover:bg-surface-muted">
                  {link.label}
                </Link>
              ))}
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
