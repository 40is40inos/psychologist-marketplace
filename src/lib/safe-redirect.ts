import { isLocale, type Locale } from "@/i18n/config";

/**
 * Accept a post-sign-in "next" path only if it is a same-site path in a
 * known locale. Blocks open redirects like //evil.com or https://...
 */
export function safeNextPath(next: unknown, locale: Locale): string | null {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return null;
  }
  return isLocale(next.split("/")[1]) ? next : `/${locale}${next}`;
}
