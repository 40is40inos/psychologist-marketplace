/**
 * Demo data used until the database-backed search lands. The shape matches
 * what the search query will return, so components won't change.
 * All people here are fictional.
 */
import type { Locale } from "@/i18n/config";
import type { SessionOffering, SessionType } from "@/domain/session-types";
import type { Dictionary } from "@/i18n/get-dictionary";

export type ConcernKey = keyof Dictionary["concerns"];
export type LanguageKey = keyof Dictionary["languages"];

export interface City {
  slug: string;
  name: Record<Locale, string>;
}

export const cities: City[] = [
  { slug: "athens", name: { el: "Αθήνα", en: "Athens" } },
  { slug: "thessaloniki", name: { el: "Θεσσαλονίκη", en: "Thessaloniki" } },
  { slug: "patras", name: { el: "Πάτρα", en: "Patras" } },
  { slug: "heraklion", name: { el: "Ηράκλειο", en: "Heraklion" } },
];

export interface TherapistSummary {
  slug: string;
  name: Record<Locale, string>;
  title: Record<Locale, string>;
  headline: Record<Locale, string>;
  citySlug: string;
  verified: boolean;
  practisingSince: number;
  languages: LanguageKey[];
  concerns: ConcernKey[];
  offerings: SessionOffering[];
  /** ISO timestamp, UTC. */
  nextAvailable: string;
}

const psychologist = { el: "Ψυχολόγος", en: "Psychologist" };
const clinical = { el: "Κλινική Ψυχολόγος", en: "Clinical psychologist" };
const psychotherapist = { el: "Ψυχολόγος, Ψυχοθεραπευτής", en: "Psychologist, psychotherapist" };

export const demoTherapists: TherapistSummary[] = [
  {
    slug: "eleni-papadopoulou",
    name: { el: "Ελένη Παπαδοπούλου", en: "Eleni Papadopoulou" },
    title: clinical,
    headline: {
      el: "Γνωστική-συμπεριφορική θεραπεία για άγχος και κρίσεις πανικού",
      en: "Cognitive behavioural therapy for anxiety and panic",
    },
    citySlug: "athens",
    verified: true,
    practisingSince: 2011,
    languages: ["el", "en"],
    concerns: ["anxiety", "stress", "selfEsteem"],
    offerings: [
      { type: "in_person", durationMinutes: 50, priceCents: 7000 },
      { type: "video", durationMinutes: 50, priceCents: 6000 },
    ],
    nextAvailable: "2026-11-20T15:00:00Z",
  },
  {
    slug: "nikos-georgiou",
    name: { el: "Νίκος Γεωργίου", en: "Nikos Georgiou" },
    title: psychotherapist,
    headline: {
      el: "Συστημική θεραπεία για ζευγάρια και οικογένειες",
      en: "Systemic therapy for couples and families",
    },
    citySlug: "thessaloniki",
    verified: true,
    practisingSince: 2008,
    languages: ["el"],
    concerns: ["relationships", "parenting"],
    offerings: [
      { type: "in_person", durationMinutes: 60, priceCents: 8000 },
      { type: "video", durationMinutes: 60, priceCents: 7000 },
      { type: "phone", durationMinutes: 50, priceCents: 5500 },
    ],
    nextAvailable: "2026-11-21T09:30:00Z",
  },
  {
    slug: "maria-konstantinou",
    name: { el: "Μαρία Κωνσταντίνου", en: "Maria Konstantinou" },
    title: psychologist,
    headline: {
      el: "Υποστήριξη στο πένθος και σε μεγάλες αλλαγές ζωής",
      en: "Support through grief and major life changes",
    },
    citySlug: "athens",
    verified: true,
    practisingSince: 2016,
    languages: ["el", "en", "fr"],
    concerns: ["grief", "depression"],
    offerings: [
      { type: "video", durationMinutes: 50, priceCents: 5000 },
      { type: "phone", durationMinutes: 50, priceCents: 4500 },
    ],
    nextAvailable: "2026-11-20T17:00:00Z",
  },
  {
    slug: "dimitris-alexiou",
    name: { el: "Δημήτρης Αλεξίου", en: "Dimitris Alexiou" },
    title: clinical,
    headline: {
      el: "Θεραπεία τραύματος με EMDR",
      en: "Trauma-focused therapy with EMDR",
    },
    citySlug: "patras",
    verified: true,
    practisingSince: 2013,
    languages: ["el", "en"],
    concerns: ["trauma", "anxiety"],
    offerings: [
      { type: "in_person", durationMinutes: 50, priceCents: 6500 },
      { type: "video", durationMinutes: 50, priceCents: 6500 },
    ],
    nextAvailable: "2026-11-24T13:00:00Z",
  },
  {
    slug: "sofia-makri",
    name: { el: "Σοφία Μακρή", en: "Sofia Makri" },
    title: psychotherapist,
    headline: {
      el: "Επαγγελματική εξουθένωση και ισορροπία εργασίας-ζωής",
      en: "Burnout and work-life balance",
    },
    citySlug: "heraklion",
    verified: true,
    practisingSince: 2018,
    languages: ["el", "en", "de"],
    concerns: ["stress", "selfEsteem", "depression"],
    offerings: [
      { type: "in_person", durationMinutes: 50, priceCents: 5500 },
      { type: "video", durationMinutes: 50, priceCents: 5000 },
      { type: "phone", durationMinutes: 50, priceCents: 4500 },
    ],
    nextAvailable: "2026-11-22T08:00:00Z",
  },
  {
    slug: "giorgos-vlachos",
    name: { el: "Γιώργος Βλάχος", en: "Giorgos Vlachos" },
    title: psychologist,
    headline: {
      el: "Ψυχοδυναμική ψυχοθεραπεία για ενήλικες",
      en: "Psychodynamic psychotherapy for adults",
    },
    citySlug: "athens",
    verified: true,
    practisingSince: 2005,
    languages: ["el"],
    concerns: ["depression", "relationships", "selfEsteem"],
    offerings: [{ type: "in_person", durationMinutes: 50, priceCents: 9000 }],
    nextAvailable: "2026-11-25T16:00:00Z",
  },
];

/** Lowest price across all demo therapists for a session type, in cents. */
export function lowestPrice(type: SessionType): number | null {
  const prices = demoTherapists.flatMap((t) =>
    t.offerings.filter((o) => o.type === type).map((o) => o.priceCents),
  );
  return prices.length ? Math.min(...prices) : null;
}
