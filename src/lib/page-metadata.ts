import type { Metadata } from "next";
import { isLocale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/get-dictionary";

/**
 * `generateMetadata` for a page that isn't indexed: a translated tab title
 * plus `noindex`. Titles stay generic (never a client's or psychologist's
 * name) so nothing personal ends up in browser history or screen shares.
 *
 *   export const generateMetadata = privatePageMetadata((d) => d.paymentsPage.title);
 */
export function privatePageMetadata(title: (dict: Dictionary) => string, extra: Metadata = {}) {
  return async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
    const { lang } = await params;
    if (!isLocale(lang)) return {};
    return { title: title(await getDictionary(lang)), robots: { index: false }, ...extra };
  };
}
