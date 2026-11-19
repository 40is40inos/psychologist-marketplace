/**
 * Shared taxonomy for search filters, profiles and matching. Slugs are
 * stored in the Specialty table; labels live in the dictionaries under
 * taxonomy.* so every language is type-checked.
 */
export const CONCERNS = [
  "anxiety",
  "depression",
  "relationships",
  "trauma",
  "grief",
  "stress",
  "eating",
  "addiction",
  "ocd",
  "lgbtq",
  "parenting",
  "self_esteem",
  "sleep",
  "panic",
  "life_transitions",
] as const;

export const APPROACHES = [
  "cbt",
  "psychodynamic",
  "systemic",
  "humanistic",
  "emdr",
  "schema",
  "act",
  "gestalt",
] as const;

export const CLIENT_TYPES = ["individuals", "couples", "families", "children", "adolescents"] as const;

export const GENDERS = ["female", "male", "nonbinary"] as const;

export const SESSION_LANGUAGES = ["el", "en", "fr", "de"] as const;

export type Concern = (typeof CONCERNS)[number];
export type Approach = (typeof APPROACHES)[number];
export type ClientType = (typeof CLIENT_TYPES)[number];
export type GenderFilter = (typeof GENDERS)[number];
export type SessionLanguage = (typeof SESSION_LANGUAGES)[number];

export const SPECIALTY_KINDS = {
  concern: CONCERNS,
  approach: APPROACHES,
  client_type: CLIENT_TYPES,
} as const;

export function pickValid<T extends string>(values: string[], allowed: readonly T[]): T[] {
  return values.filter((v): v is T => (allowed as readonly string[]).includes(v));
}
