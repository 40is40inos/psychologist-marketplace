import { intlLocale, type Locale } from "@/i18n/config";
import { CURRENCY, currentMarket } from "@/config/market";

/** Replace {placeholders} in a dictionary string. */
export function fill(
  template: string,
  vars: Record<string, string | number> = {},
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  );
}

/**
 * Format a price. Money is always stored as integer cents to avoid float
 * errors. Whole-euro prices drop the decimals ("€70", "70 €"), which is
 * how session prices are normally quoted.
 */
export function formatPrice(cents: number, locale: Locale): string {
  const whole = cents % 100 === 0;
  return new Intl.NumberFormat(intlLocale[locale], {
    style: "currency",
    currency: CURRENCY,
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(cents / 100);
}

/** Date in the market's time zone, e.g. "Thu 20 Nov" / "Πέμ 20 Νοε". */
export function formatShortDate(date: Date | string, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale[locale], {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: currentMarket.timeZone,
  }).format(new Date(date));
}

/** Time in the market's time zone, always 24h, e.g. "18:30". */
export function formatTime(date: Date | string, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale[locale], {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: currentMarket.timeZone,
  }).format(new Date(date));
}

/** Join a list naturally: "Greek and English" / "Ελληνικά και Αγγλικά". */
export function formatList(items: string[], locale: Locale): string {
  return new Intl.ListFormat(intlLocale[locale], {
    style: "long",
    type: "conjunction",
  }).format(items);
}

/**
 * Evaluated once when the module loads (build time for static pages), so
 * prerendered pages do not depend on the request time.
 */
export const CURRENT_YEAR = new Date().getFullYear();
