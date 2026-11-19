import { brand } from "@/config/brand";
import type { Locale } from "@/i18n/config";
import type { PublicProfile } from "@/lib/profile";

/**
 * schema.org structured data. Profiles are a Person (the psychologist, with
 * the licence as a credential) working at a MedicalBusiness (the practice,
 * with address and prices). No ratings: feedback is private by policy.
 */
const base = () => brand.siteUrl.replace(/\/$/, "");

export function profileJsonLd(p: PublicProfile, locale: Locale, opts: { jobTitle: string; languages: string[]; offerLabels: Record<string, string> }) {
  const url = `${base()}/${locale}/psychologists/${p.slug}`;
  const prices = p.offerings.map((o) => o.priceCents / 100);
  const practice = {
    "@type": "MedicalBusiness",
    name: p.name,
    url,
    ...(prices.length && { priceRange: `€${Math.min(...prices)}–€${Math.max(...prices)}`, currenciesAccepted: "EUR" }),
    ...(p.office && {
      address: { "@type": "PostalAddress", streetAddress: p.office.address, postalCode: p.office.postalCode, addressLocality: p.office.city, addressCountry: "GR" },
      ...(p.office.lat != null && p.office.lng != null && { geo: { "@type": "GeoCoordinates", latitude: p.office.lat, longitude: p.office.lng } }),
    }),
    makesOffer: p.offerings.map((o) => ({
      "@type": "Offer",
      name: opts.offerLabels[o.type] ?? o.type,
      price: (o.priceCents / 100).toFixed(2),
      priceCurrency: "EUR",
    })),
  };
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${url}#person`,
    name: p.name,
    url,
    jobTitle: opts.jobTitle,
    description: p.headline,
    ...(p.photoUrl && { image: p.photoUrl.startsWith("http") ? p.photoUrl : `${base()}${p.photoUrl}` }),
    knowsLanguage: opts.languages,
    hasCredential: {
      "@type": "EducationalOccupationalCredential",
      credentialCategory: "license",
      identifier: p.licenseNumber,
      recognizedBy: { "@type": "Organization", name: p.licensingAuthority },
    },
    worksFor: practice,
  };
}

export function siteJsonLd(locale: Locale) {
  const home = `${base()}/${locale}`;
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: brand.name,
      url: home,
      inLanguage: locale,
      potentialAction: { "@type": "SearchAction", target: `${home}/psychologists?q={search_term_string}`, "query-input": "required name=search_term_string" },
    },
    { "@context": "https://schema.org", "@type": "Organization", name: brand.name, url: base(), email: brand.supportEmail },
  ];
}
