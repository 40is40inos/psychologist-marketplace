/** Mirrors the ProfessionalTitle enum in Prisma. Labels live in dictionaries under titles. */
export const PROFESSIONAL_TITLES = [
  "psychologist",
  "psychotherapist",
  "clinical_psychologist",
  "counselling_psychologist",
] as const;
export type ProfessionalTitle = (typeof PROFESSIONAL_TITLES)[number];
