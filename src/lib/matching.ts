import "server-only";
import { db } from "@/lib/db";
import { earliestSlots } from "@/lib/availability";
import { publicProfileWhere, toCard, type PsychologistCard } from "@/lib/search";
import type { SessionType } from "@/domain/session-types";
import {
  CLIENT_TYPES,
  GENDERS,
  LANGUAGE_RE,
  cleanSlugs,
  type Approach,
  type ClientType,
  type Concern,
  type GenderFilter,
  type SessionLanguage,
} from "@/domain/taxonomy";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";

/**
 * "Help me choose": turn a short questionnaire into 3-5 suggestions with
 * plain reasons. Hard requirements (who it's for, language, format, gender
 * preference) filter; everything else scores. No diagnosis, no medical claims.
 */
export const STYLES = ["practical", "explore", "unsure"] as const;
export const FORMATS = ["in_person", "online", "any"] as const;
export const BUDGETS = ["50", "70", "90", "any"] as const;
export const TIMING = ["soon", "flexible"] as const;

export interface MatchAnswers {
  forWhom: ClientType;
  concerns: Concern[];
  format: (typeof FORMATS)[number];
  city: string;
  language: SessionLanguage;
  budget: (typeof BUDGETS)[number];
  gender: GenderFilter | "any";
  style: (typeof STYLES)[number];
  timing: (typeof TIMING)[number];
}

const pick = <T extends string>(v: string | undefined, allowed: readonly T[], fallback: T): T =>
  (allowed as readonly string[]).includes(v ?? "") ? (v as T) : fallback;

export function parseAnswers(p: Record<string, string | string[] | undefined>): MatchAnswers | null {
  const s = (k: string) => (Array.isArray(p[k]) ? (p[k] as string[])[0] : (p[k] as string | undefined));
  const list = (k: string) => (Array.isArray(p[k]) ? (p[k] as string[]) : p[k] ? String(p[k]).split(",") : []);
  if (!s("for")) return null;
  return {
    forWhom: pick(s("for"), CLIENT_TYPES, "individuals"),
    concerns: cleanSlugs(list("concerns"), 5),
    format: pick(s("format"), FORMATS, "any"),
    city: /^[a-z0-9-]{2,40}$/.test(s("city") ?? "") ? s("city")! : "",
    language: LANGUAGE_RE.test(s("language") ?? "") ? s("language")! : "el",
    budget: pick(s("budget"), BUDGETS, "any"),
    gender: pick(s("gender"), [...GENDERS, "any"] as const, "any"),
    style: pick(s("style"), STYLES, "unsure"),
    timing: pick(s("timing"), TIMING, "flexible"),
  };
}

const STYLE_APPROACHES: Record<(typeof STYLES)[number], Approach[]> = {
  practical: ["cbt", "act", "schema", "emdr"],
  explore: ["psychodynamic", "humanistic", "gestalt"],
  unsure: [],
};

export type Reason =
  | { key: "concerns"; concerns: Concern[] }
  | { key: "clientType"; clientType: ClientType }
  | { key: "style"; approaches: Approach[] }
  | { key: "budget"; priceCents: number }
  | { key: "soon"; date: Date }
  | { key: "language"; language: SessionLanguage }
  | { key: "city"; city: string };

export interface Match {
  card: PsychologistCard;
  score: number;
  reasons: Reason[];
}

export async function findMatches(a: MatchAnswers, locale: Locale, titles: Dictionary["titles"]): Promise<Match[]> {
  const formats: SessionType[] = a.format === "in_person" ? ["in_person"] : a.format === "online" ? ["video", "phone"] : ["in_person", "video", "phone"];

  const rows = await db.psychologistProfile.findMany({
    where: {
      AND: [
        publicProfileWhere,
        { sessionLanguages: { has: a.language } },
        { specialties: { some: { specialty: { slug: a.forWhom } } } },
        { offerings: { some: { active: true, type: { in: formats } } } },
        ...(a.gender !== "any" ? [{ gender: a.gender }] : []),
        ...(a.format === "in_person" && a.city ? [{ offices: { some: { city: { slug: a.city } } } }] : []),
      ],
    },
    select: {
      id: true, slug: true, title: true, photoUrl: true, practisingSince: true, sessionLanguages: true,
      introCallEnabled: true, bookingNoticeHours: true, bookingWindowDays: true,
      user: { select: { name: true } },
      translations: { select: { locale: true, headline: true } },
      offerings: { where: { active: true }, select: { type: true, durationMinutes: true, priceCents: true } },
      offices: { take: 1, select: { latitude: true, longitude: true, city: { select: { slug: true, translations: { select: { locale: true, name: true } } } } } },
      specialties: { select: { specialty: { select: { slug: true, kind: true } } } },
    },
    take: 200,
  });

  const earliest = await earliestSlots(
    rows.map((r) => ({ id: r.id, bookingNoticeHours: r.bookingNoticeHours, bookingWindowDays: r.bookingWindowDays, minDuration: 50 })),
    28,
  );
  const budgetCents = a.budget === "any" ? null : Number(a.budget) * 100;
  const preferred = STYLE_APPROACHES[a.style];

  const matches = rows.map((row): Match => {
    const card = { ...toCard(row, locale, titles, a.concerns), nextAvailable: earliest.get(row.id) ?? null };
    const reasons: Reason[] = [];
    let score = 0;

    const shared = a.concerns.filter((c) => card.concerns.includes(c));
    if (shared.length) {
      score += shared.length * 3;
      reasons.push({ key: "concerns", concerns: shared });
    }
    if (a.forWhom !== "individuals") reasons.push({ key: "clientType", clientType: a.forWhom });

    const styleMatch = preferred.filter((ap) => card.approaches.includes(ap));
    if (styleMatch.length) {
      score += 2;
      reasons.push({ key: "style", approaches: styleMatch });
    }

    const prices = card.offerings.filter((o) => formats.includes(o.type)).map((o) => o.priceCents);
    const cheapest = Math.min(...prices);
    if (budgetCents !== null) {
      if (cheapest <= budgetCents) {
        score += 2;
        reasons.push({ key: "budget", priceCents: cheapest });
      } else {
        score -= Math.ceil((cheapest - budgetCents) / 1000); // -1 per €10 over budget
      }
    }

    if (card.nextAvailable) {
      const days = (+card.nextAvailable - Date.now()) / 86_400_000;
      if (a.timing === "soon" && days <= 7) {
        score += 2;
        reasons.push({ key: "soon", date: card.nextAvailable });
      } else score += days <= 14 ? 1 : 0;
    } else score -= 3;

    if (a.language !== "el") reasons.push({ key: "language", language: a.language });
    if (a.format === "in_person" && card.city) reasons.push({ key: "city", city: card.city.name });

    return { card, score, reasons };
  });

  const ranked = matches.sort(
    (x, y) => y.score - x.score || +(x.card.nextAvailable ?? Infinity) - +(y.card.nextAvailable ?? Infinity),
  );
  // Prefer people who treat the stated concerns; top up with the next best
  // so the person still gets at least three options when possible.
  const strong = ranked.filter((m) => a.concerns.length === 0 || m.reasons.some((r) => r.key === "concerns"));
  const rest = ranked.filter((m) => !strong.includes(m));
  return [...strong, ...rest].slice(0, Math.max(3, Math.min(5, strong.length)));
}
