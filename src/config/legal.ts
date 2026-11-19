/**
 * Legal documents and their current versions. Bump a version when the
 * document changes materially; consent records store the version accepted.
 */
export const LEGAL_VERSION = "2026-11";

export const LEGAL_PAGES = {
  terms: "terms",
  termsPsychologists: "terms-psychologists",
  cancellation: "cancellation-policy",
  privacy: "privacy",
  cookies: "cookies",
} as const;

export const CONSENT_COOKIE = "cookie_consent";
