import type { Metadata, Viewport } from "next";
import { Commissioner, Literata } from "next/font/google";
import { notFound } from "next/navigation";
import { brand } from "@/config/brand";
import { isLocale, locales, ogLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { fill } from "@/lib/format";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import "../globals.css";

// Both families include Greek glyphs. Commissioner is by a Greek type designer.
const commissioner = Commissioner({
  subsets: ["latin", "greek"],
  variable: "--font-commissioner",
  display: "swap",
});
const literata = Literata({
  subsets: ["latin", "greek"],
  variable: "--font-literata",
  display: "swap",
});

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf8f3" },
    { media: "(prefers-color-scheme: dark)", color: "#111716" },
  ],
};

export async function generateMetadata({
  params,
}: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = await getDictionary(lang);
  const title = fill(dict.meta.title, { brand: brand.name });

  return {
    metadataBase: new URL(brand.siteUrl),
    title: { default: title, template: `%s | ${brand.name}` },
    description: dict.meta.description,
    alternates: {
      canonical: `/${lang}`,
      languages: {
        ...Object.fromEntries(locales.map((l) => [l, `/${l}`])),
        "x-default": "/el",
      },
    },
    openGraph: {
      title,
      description: dict.meta.description,
      siteName: brand.name,
      locale: ogLocale[lang],
      alternateLocale: locales.filter((l) => l !== lang).map((l) => ogLocale[l]),
      type: "website",
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <html
      lang={lang}
      className={`${commissioner.variable} ${literata.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-ink"
        >
          {dict.a11y.skipToContent}
        </a>
        <SiteHeader locale={lang} dict={dict} />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter locale={lang} dict={dict} />
      </body>
    </html>
  );
}
