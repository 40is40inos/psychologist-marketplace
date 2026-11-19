import { Suspense } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
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
    { href: `/${locale}#for-psychologists`, label: dict.nav.forPsychologists },
  ];

  return (
    <header className="sticky top-0 z-30 print:hidden border-b border-border bg-bg/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:gap-4 sm:px-6">
        <Logo locale={locale} />

        <nav aria-label={dict.a11y.mainNav} className="hidden items-center gap-6 md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm font-medium text-muted transition-colors hover:text-ink">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {/* The switcher reads the URL, so it streams in; the fallback links to each home page. */}
          <Suspense fallback={<LanguageSwitcherFallback current={locale} label={dict.a11y.changeLanguage} />}>
            <LanguageSwitcher current={locale} label={dict.a11y.changeLanguage} />
          </Suspense>
          <Suspense fallback={<div className="h-10 w-16" />}>
            <UserMenu locale={locale} dict={dict} />
          </Suspense>

          {/* Mobile menu: a native disclosure, so it works without JavaScript. */}
          <details className="group relative md:hidden">
            <summary
              className="grid size-11 cursor-pointer place-items-center rounded-lg text-ink hover:bg-surface-muted"
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
