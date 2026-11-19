/**
 * Locale configuration. Add a locale here, add its dictionary in
 * ./dictionaries, and every route, the switcher and hreflang tags pick it up.
 */
export const locales = ["el", "en"] as const;
export type Locale = (typeof locales)[number];

/** Greek is the primary market, so it is the fallback locale. */
export const defaultLocale: Locale = "el";

export const LOCALE_COOKIE = "NEXT_LOCALE";

/** Native names for the language switcher. */
export const localeNames: Record<Locale, string> = {
  el: "Ελληνικά",
  en: "English",
};

/**
 * BCP 47 tags passed to Intl.* formatters. English uses en-IE so euro
 * amounts, dates and 24h times follow EU conventions, not US ones.
 */
export const intlLocale: Record<Locale, string> = {
  el: "el-GR",
  en: "en-IE",
};

/** Open Graph locale codes. */
export const ogLocale: Record<Locale, string> = {
  el: "el_GR",
  en: "en_GB",
};

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}
