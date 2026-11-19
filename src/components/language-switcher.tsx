"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Globe } from "lucide-react";
import { locales, localeNames, type Locale } from "@/i18n/config";

/** Switches language while staying on the same page. */
export function LanguageSwitcher({
  current,
  label,
}: {
  current: Locale;
  label: string;
}) {
  const pathname = usePathname() ?? `/${current}`;

  return (
    <nav aria-label={label} className="flex items-center gap-1 text-sm">
      <Globe className="size-4 text-muted" aria-hidden="true" />
      {locales.map((locale) => {
        const segments = pathname.split("/");
        segments[1] = locale;
        const active = locale === current;
        return (
          <Link
            key={locale}
            href={segments.join("/") || `/${locale}`}
            hrefLang={locale}
            lang={locale}
            aria-current={active ? "true" : undefined}
            className={`rounded-md px-2 py-1.5 font-medium uppercase transition-colors ${
              active
                ? "bg-primary-soft text-primary"
                : "text-muted hover:text-ink"
            }`}
          >
            <span aria-hidden="true">{locale}</span>
            <span className="sr-only">{localeNames[locale]}</span>
          </Link>
        );
      })}
    </nav>
  );
}
