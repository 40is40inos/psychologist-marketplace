import "server-only";
import { displayName } from "@/lib/slug";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { earliestSlots } from "@/lib/availability";
import { localDateKey, zonedToUtc } from "@/lib/time";
import { isSessionType, type SessionType } from "@/domain/session-types";
import {
  GENDERS,
  LANGUAGE_RE,
  cleanSlugs,
  pickValid,
  type Approach,
  type ClientType,
  type Concern,
  type GenderFilter,
  type SessionLanguage,
} from "@/domain/taxonomy";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { normalize } from "@/lib/text";

export const ONLINE = "online";
import { AVAILABILITY_WINDOWS, SORTS } from "@/lib/search-constants";
export { AVAILABILITY_WINDOWS, SORTS };

export interface SearchFilters {
  q: string;
  concerns: Concern[];
  approaches: Approach[];
  clientTypes: ClientType[];
  format: SessionType | "";
  /** City slug, "online", or "" for anywhere. */
  location: string;
  language: SessionLanguage | "";
  gender: GenderFilter | "";
  /** Whole euros. */
  priceMin: number | null;
  priceMax: number | null;
  availability: (typeof AVAILABILITY_WINDOWS)[number] | "";
  /** Local date "YYYY-MM-DD": must have a free slot that day. */
  date: string;
  sort: (typeof SORTS)[number];
}

type RawParams = Record<string, string | string[] | undefined>;

function all(v: string | string[] | undefined): string[] {
  return (Array.isArray(v) ? v : v ? [v] : []).flatMap((x) => x.split(",")).map((x) => x.trim()).filter(Boolean);
}
function one(v: string | string[] | undefined): string {
  return all(v)[0] ?? "";
}
function euros(v: string): number | null {
  const n = Number(v);
  return v && Number.isFinite(n) && n >= 0 && n <= 1000 ? Math.round(n) : null;
}

export function parseFilters(params: RawParams): SearchFilters {
  const format = one(params.format) || one(params.type);
  const location = one(params.location);
  const date = one(params.date);
  const availability = one(params.available);
  const sort = one(params.sort);
  return {
    q: one(params.q || params.concern).slice(0, 80),
    concerns: cleanSlugs(all(params.concerns)),
    approaches: cleanSlugs(all(params.approaches)),
    clientTypes: cleanSlugs(all(params.for)) as ClientType[],
    format: isSessionType(format) ? format : "",
    location: /^[a-z0-9-]{2,40}$/.test(location) ? location : "",
    language: LANGUAGE_RE.test(one(params.language)) ? one(params.language) : "",
    gender: pickValid([one(params.gender)], GENDERS)[0] ?? "",
    priceMin: euros(one(params.min)),
    priceMax: euros(one(params.max)),
    availability: (AVAILABILITY_WINDOWS as readonly string[]).includes(availability) ? (availability as SearchFilters["availability"]) : "",
    date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "",
    sort: (SORTS as readonly string[]).includes(sort) ? (sort as SearchFilters["sort"]) : "relevance",
  };
}

/** Back to URL params, dropping empty values. */
export function filtersToParams(f: SearchFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  for (const c of f.concerns) p.append("concerns", c);
  for (const a of f.approaches) p.append("approaches", a);
  for (const c of f.clientTypes) p.append("for", c);
  if (f.format) p.set("format", f.format);
  if (f.location) p.set("location", f.location);
  if (f.language) p.set("language", f.language);
  if (f.gender) p.set("gender", f.gender);
  if (f.priceMin !== null) p.set("min", String(f.priceMin));
  if (f.priceMax !== null) p.set("max", String(f.priceMax));
  if (f.availability) p.set("available", f.availability);
  if (f.date) p.set("date", f.date);
  if (f.sort !== "relevance") p.set("sort", f.sort);
  return p;
}

export function activeFilterCount(f: SearchFilters): number {
  return (
    f.concerns.length + f.approaches.length + f.clientTypes.length +
    [f.format, f.language, f.gender, f.availability, f.date].filter(Boolean).length +
    (f.priceMin !== null || f.priceMax !== null ? 1 : 0)
  );
}

/** Map free text ("άγχος", "panic attacks") to concern slugs via labels in every language. */
export function concernsFromText(q: string, labels: Record<string, string[]>): Concern[] {
  const query = normalize(q);
  if (query.length < 3) return [];
  return Object.entries(labels)
    .filter(([, ls]) => ls.some((l) => {
      const label = normalize(l);
      return label.length > 0 && (label.includes(query) || query.includes(label));
    }))
    .map(([slug]) => slug);
}

export interface PsychologistCard {
  id: string;
  slug: string;
  name: string;
  title: string;
  photoUrl: string | null;
  licenseNumber: string;
  headline: string;
  city: { slug: string; name: string } | null;
  coords: { lat: number; lng: number } | null;
  practisingSince: number | null;
  languages: string[];
  concerns: Concern[];
  approaches: Approach[];
  offerings: { type: SessionType; durationMinutes: number; priceCents: number }[];
  introCall: boolean;
  nextAvailable: Date | null;
  /** How many of the requested concerns this person treats. */
  matchedConcerns: number;
  /** Plan includes "featured" placement. */
  featured: boolean;
}

const cardSelect = {
  id: true,
  slug: true,
  title: true,
  photoUrl: true,
  licenseNumber: true,
  practisingSince: true,
  sessionLanguages: true,
  introCallEnabled: true,
  bookingNoticeHours: true,
  bookingWindowDays: true,
  user: { select: { name: true } },
  translations: { select: { locale: true, headline: true } },
  offerings: { where: { active: true }, select: { type: true, durationMinutes: true, priceCents: true } },
  offices: {
    take: 1,
    select: { latitude: true, longitude: true, city: { select: { slug: true, translations: { select: { locale: true, name: true } } } } },
  },
  specialties: { select: { specialty: { select: { slug: true, kind: true } } } },
  plan: { select: { active: true, features: true } },
} satisfies Prisma.PsychologistProfileSelect;

type Row = Prisma.PsychologistProfileGetPayload<{ select: typeof cardSelect }>;

export function toCard(
  row: Omit<Row, "plan"> & { plan?: Row["plan"] },
  locale: Locale,
  titles: Dictionary["titles"],
  wanted: Concern[] = [],
  defaultFeatures: string[] = [],
): Omit<PsychologistCard, "nextAvailable"> {
  const tr = row.translations.find((t) => t.locale === locale) ?? row.translations[0];
  const office = row.offices[0];
  const concerns = row.specialties.filter((s) => s.specialty.kind === "concern").map((s) => s.specialty.slug as Concern);
  return {
    id: row.id,
    slug: row.slug,
    name: displayName(row.user.name, locale),
    title: titles[row.title],
    photoUrl: row.photoUrl,
    licenseNumber: row.licenseNumber,
    headline: tr?.headline ?? "",
    city: office ? { slug: office.city.slug, name: (office.city.translations.find((t) => t.locale === locale) ?? office.city.translations[0])?.name ?? office.city.slug } : null,
    coords: office?.latitude != null && office.longitude != null ? { lat: office.latitude, lng: office.longitude } : null,
    practisingSince: row.practisingSince,
    languages: row.sessionLanguages,
    concerns,
    approaches: row.specialties.filter((s) => s.specialty.kind === "approach").map((s) => s.specialty.slug as Approach),
    offerings: row.offerings,
    introCall: row.introCallEnabled,
    matchedConcerns: wanted.filter((c) => concerns.includes(c)).length,
    featured: (row.plan?.active ? row.plan.features : defaultFeatures).includes("featured"),
  };
}

/** Public profiles only: verified, published, owner active. */
export const publicProfileWhere: Prisma.PsychologistProfileWhereInput = {
  verificationStatus: "verified",
  published: true,
  user: { status: "active", deletedAt: null },
};

export async function searchPsychologists(
  f: SearchFilters,
  locale: Locale,
  concernLabels: Record<string, string[]>,
  titles: Dictionary["titles"],
): Promise<PsychologistCard[]> {
  // Free text adds concern matches; it never narrows to zero on its own if
  // the text also appears in a headline.
  const textConcerns = f.q ? concernsFromText(f.q, concernLabels) : [];
  const wantedConcerns = [...new Set([...f.concerns, ...textConcerns])];

  const offeringFilter: Prisma.SessionOfferingWhereInput = {
    active: true,
    ...(f.format && { type: f.format }),
    ...(f.location === ONLINE && !f.format && { type: { in: ["video", "phone"] } }),
    ...((f.priceMin !== null || f.priceMax !== null) && {
      priceCents: {
        ...(f.priceMin !== null && { gte: f.priceMin * 100 }),
        ...(f.priceMax !== null && { lte: f.priceMax * 100 }),
      },
    }),
  };

  const and: Prisma.PsychologistProfileWhereInput[] = [publicProfileWhere, { offerings: { some: offeringFilter } }];
  if (f.concerns.length) and.push({ specialties: { some: { specialty: { slug: { in: f.concerns } } } } });
  if (f.approaches.length) and.push({ specialties: { some: { specialty: { slug: { in: f.approaches } } } } });
  for (const ct of f.clientTypes) and.push({ specialties: { some: { specialty: { slug: ct } } } });
  if (f.language) and.push({ sessionLanguages: { has: f.language } });
  if (f.gender) and.push({ gender: f.gender });
  if (f.location && f.location !== ONLINE) {
    and.push({ offices: { some: { city: { slug: f.location } } } });
    and.push({ offerings: { some: { active: true, type: "in_person" } } });
  }
  if (f.q) {
    and.push({
      OR: [
        ...(textConcerns.length ? [{ specialties: { some: { specialty: { slug: { in: textConcerns } } } } }] : []),
        { translations: { some: { headline: { contains: f.q, mode: "insensitive" } } } },
        { translations: { some: { bio: { contains: f.q, mode: "insensitive" } } } },
        { user: { name: { contains: f.q, mode: "insensitive" } } },
      ],
    });
  }

  const rows = await db.psychologistProfile.findMany({ where: { AND: and }, select: cardSelect, take: 100 });
  const defaultPlan = await db.plan.findFirst({ where: { isDefault: true, active: true }, select: { features: true } });

  // Availability: earliest slot from now, or from the chosen date.
  const [y, m, d] = f.date ? f.date.split("-").map(Number) : [];
  const from = f.date ? zonedToUtc(y, m, d, 0) : undefined;
  const earliest = await earliestSlots(
    rows.map((r) => ({
      id: r.id,
      bookingNoticeHours: r.bookingNoticeHours,
      bookingWindowDays: r.bookingWindowDays,
      minDuration: Math.min(...r.offerings.map((o) => o.durationMinutes), 50),
    })),
    f.date ? 1 : 28,
    from,
  );

  const now = Date.now();
  const limitMs = { today: 0, week: 7, "2weeks": 14 }[f.availability as "today"] ?? null;
  let cards = rows.map((r) => ({ ...toCard(r, locale, titles, wantedConcerns, defaultPlan?.features), nextAvailable: earliest.get(r.id) ?? null }));

  if (f.date) cards = cards.filter((c) => c.nextAvailable && localDateKey(c.nextAvailable) === f.date);
  if (f.availability === "today") {
    const today = localDateKey(new Date());
    cards = cards.filter((c) => c.nextAvailable && localDateKey(c.nextAvailable) === today);
  } else if (limitMs !== null && f.availability) {
    cards = cards.filter((c) => c.nextAvailable && +c.nextAvailable - now <= limitMs * 86_400_000);
  }

  const minPrice = (c: PsychologistCard) => Math.min(...c.offerings.filter((o) => !f.format || o.type === f.format).map((o) => o.priceCents));
  const soon = (c: PsychologistCard) => (c.nextAvailable ? +c.nextAvailable : Infinity);
  const sorters: Record<SearchFilters["sort"], (a: PsychologistCard, b: PsychologistCard) => number> = {
    // Featured plans get a boost among equally relevant results.
    relevance: (a, b) => b.matchedConcerns - a.matchedConcerns || Number(b.featured) - Number(a.featured) || soon(a) - soon(b),
    earliest: (a, b) => soon(a) - soon(b),
    price_low: (a, b) => minPrice(a) - minPrice(b),
    price_high: (a, b) => minPrice(b) - minPrice(a),
  };
  return cards.sort(sorters[f.sort]);
}
