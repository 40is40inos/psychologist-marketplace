/**
 * Taxonomy defaults. At runtime the lists come from the database
 * (src/lib/taxonomy-data.ts) and admins can edit them; these constants seed
 * the database and back the built-in dictionary labels.
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

export const APPROACHES = ["cbt", "psychodynamic", "systemic", "humanistic", "emdr", "schema", "act", "gestalt"] as const;

/** Client types drive the "Help me choose" wording, so they stay fixed in code. */
export const CLIENT_TYPES = ["individuals", "couples", "families", "children", "adolescents"] as const;

export const GENDERS = ["female", "male", "nonbinary"] as const;

export const SESSION_LANGUAGES = ["el", "en", "fr", "de"] as const;

/** Taxonomy slugs are admin-editable, so at runtime they are plain strings. */
export type Concern = string;
export type Approach = string;
export type ClientType = (typeof CLIENT_TYPES)[number];
export type GenderFilter = (typeof GENDERS)[number];
export type SessionLanguage = string;

export const SPECIALTY_KINDS = {
  concern: CONCERNS,
  approach: APPROACHES,
  client_type: CLIENT_TYPES,
} as const;

export const SLUG_RE = /^[a-z0-9_-]{2,40}$/;
export const LANGUAGE_RE = /^[a-z]{2}$/;

/** Keep only well-formed slugs (unknown ones simply match nothing in queries). */
export function cleanSlugs(values: string[], max = 20): string[] {
  return [...new Set(values.filter((v) => SLUG_RE.test(v)))].slice(0, max);
}

export function pickValid<T extends string>(values: string[], allowed: readonly T[]): T[] {
  return values.filter((v): v is T => (allowed as readonly string[]).includes(v));
}
