import "server-only";
import { displayName } from "@/lib/slug";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import { publicProfileWhere } from "@/lib/search";
import type { SessionType } from "@/domain/session-types";
import type { Approach, ClientType, Concern } from "@/domain/taxonomy";
import type { Locale } from "@/i18n/config";

export interface PublicProfile {
  id: string;
  slug: string;
  name: string;
  title: string;
  gender: string;
  photoUrl: string | null;
  videoUrl: string | null;
  headline: string;
  bio: string;
  approachText: string | null;
  /** Locale the text is actually in (falls back when not translated). */
  textLocale: Locale;
  licenseNumber: string;
  licensingAuthority: string;
  practisingSince: number | null;
  languages: string[];
  concerns: Concern[];
  approaches: Approach[];
  clientTypes: ClientType[];
  education: { degree: string; institution: string; year: number | null }[];
  faqs: { question: string; answer: string }[];
  offerings: { type: SessionType; durationMinutes: number; priceCents: number }[];
  office: { address: string; postalCode: string; city: string; lat: number | null; lng: number | null; wheelchair: boolean } | null;
  introCall: boolean;
  cancellationHours: number;
  lateFeePercent: number;
  bookingNoticeHours: number;
  bookingWindowDays: number;
  /** Published feedback: consented by the client and approved by an admin. */
  reviews: { rating: number; comment: string | null; date: Date }[];
  ratingAverage: number | null;
}

/** Public profile data. Cached briefly; availability is computed separately (live). */
export async function getPublicProfile(slug: string, locale: Locale): Promise<PublicProfile | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(`profile:${slug}`);

  const p = await db.psychologistProfile.findFirst({
    where: { slug, ...publicProfileWhere },
    include: {
      user: { select: { name: true } },
      translations: true,
      specialties: { select: { specialty: { select: { slug: true, kind: true } } } },
      education: { orderBy: { sortOrder: "asc" } },
      faqs: { orderBy: { sortOrder: "asc" } },
      offerings: { where: { active: true }, orderBy: { priceCents: "desc" } },
      offices: { take: 1, include: { city: { include: { translations: true } } } },
      feedback: {
        where: { publicConsent: true, moderationStatus: "approved" },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { rating: true, comment: true, createdAt: true },
      },
    },
  });
  if (!p) return null;

  const tr = p.translations.find((t) => t.locale === locale) ?? p.translations[0];
  const faqs = p.faqs.filter((f) => f.locale === locale);
  const office = p.offices[0];
  const ofKind = (k: string) => p.specialties.filter((s) => s.specialty.kind === k).map((s) => s.specialty.slug);

  return {
    id: p.id,
    slug: p.slug,
    name: displayName(p.user.name, locale),
    title: p.title,
    gender: p.gender,
    photoUrl: p.photoUrl,
    videoUrl: p.videoUrl,
    headline: tr?.headline ?? "",
    bio: tr?.bio ?? "",
    approachText: tr?.approach ?? null,
    textLocale: tr?.locale ?? locale,
    licenseNumber: p.licenseNumber,
    licensingAuthority: p.licensingAuthority,
    practisingSince: p.practisingSince,
    languages: p.sessionLanguages,
    concerns: ofKind("concern") as Concern[],
    approaches: ofKind("approach") as Approach[],
    clientTypes: ofKind("client_type") as ClientType[],
    education: p.education.map((e) => ({ degree: e.degree, institution: e.institution, year: e.year })),
    faqs: (faqs.length ? faqs : p.faqs.filter((f) => f.locale === tr?.locale)).map((f) => ({ question: f.question, answer: f.answer })),
    offerings: p.offerings.map((o) => ({ type: o.type, durationMinutes: o.durationMinutes, priceCents: o.priceCents })),
    office: office
      ? {
          address: office.addressLine,
          postalCode: office.postalCode,
          city: office.city.translations.find((t) => t.locale === locale)?.name ?? office.city.slug,
          lat: office.latitude,
          lng: office.longitude,
          wheelchair: office.wheelchairAccessible,
        }
      : null,
    introCall: p.introCallEnabled,
    cancellationHours: p.cancellationHours,
    lateFeePercent: p.lateCancellationFeePercent,
    bookingNoticeHours: p.bookingNoticeHours,
    bookingWindowDays: p.bookingWindowDays,
    reviews: p.feedback.map((f) => ({ rating: f.rating, comment: f.comment, date: f.createdAt })),
    ratingAverage: p.feedback.length ? p.feedback.reduce((s, f) => s + f.rating, 0) / p.feedback.length : null,
  };
}

/** Privacy-friendly embed URL for YouTube or Vimeo, or null if unsupported. */
export function videoEmbed(url: string | null): { src: string; host: string } | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const yt = u.hostname.replace(/^www\./, "");
    if (yt === "youtube.com" || yt === "youtu.be") {
      const id = yt === "youtu.be" ? u.pathname.slice(1) : u.searchParams.get("v");
      if (id && /^[\w-]{6,20}$/.test(id)) return { src: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1`, host: "YouTube" };
    }
    if (yt === "vimeo.com") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      if (id && /^\d+$/.test(id)) return { src: `https://player.vimeo.com/video/${id}?dnt=1&autoplay=1`, host: "Vimeo" };
    }
  } catch {}
  return null;
}
