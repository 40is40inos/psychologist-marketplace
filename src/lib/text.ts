/** Lowercase and strip accents so "άγχος", "Αγχος" and "αγχος" all match. */
export function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}
