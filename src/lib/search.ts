import { isSessionType, type SessionType } from "@/domain/session-types";
import type { Dictionary } from "@/i18n/get-dictionary";
import {
  cities,
  demoTherapists,
  type TherapistSummary,
} from "@/data/demo-therapists";

export const ONLINE = "online";

export interface SearchFilters {
  concern: string;
  /** City slug, "online", or "" for anywhere. */
  location: string;
  type: SessionType | "";
}

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

export function parseFilters(params: RawParams): SearchFilters {
  const location = first(params.location);
  const type = first(params.type);
  return {
    concern: first(params.concern).slice(0, 80),
    location:
      location === ONLINE || cities.some((c) => c.slug === location)
        ? location
        : "",
    type: isSessionType(type) ? type : "",
  };
}

/** Lowercase and strip accents so "άγχος", "Αγχος" and "αγχος" all match. */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/**
 * Filter therapists. Concern text matches the concern names in both
 * languages plus the headline, so a Greek query works on the English site
 * and vice versa.
 */
export function searchTherapists(
  filters: SearchFilters,
  dictionaries: Dictionary[],
): TherapistSummary[] {
  const query = normalize(filters.concern);

  return demoTherapists.filter((t) => {
    if (filters.type && !t.offerings.some((o) => o.type === filters.type)) {
      return false;
    }
    if (filters.location === ONLINE) {
      if (!t.offerings.some((o) => o.type !== "in_person")) return false;
    } else if (filters.location && t.citySlug !== filters.location) {
      return false;
    }
    if (query) {
      const haystack = [
        ...Object.values(t.headline),
        ...t.concerns.flatMap((c) => [c, ...dictionaries.map((d) => d.concerns[c])]),
      ]
        .map(normalize)
        .join(" ");
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}
