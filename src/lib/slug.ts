const GREEK: Record<string, string> = {
  α: "a", β: "v", γ: "g", δ: "d", ε: "e", ζ: "z", η: "i", θ: "th", ι: "i", κ: "k",
  λ: "l", μ: "m", ν: "n", ξ: "x", ο: "o", π: "p", ρ: "r", σ: "s", ς: "s", τ: "t",
  υ: "y", φ: "f", χ: "ch", ψ: "ps", ω: "o",
};

/** Two-letter combinations that romanise as a unit (simplified ELOT 743). */
const DIGRAPHS: [RegExp, string][] = [
  [/ου/g, "ou"],
  [/αυ/g, "av"],
  [/ευ/g, "ev"],
  [/ηυ/g, "iv"],
  [/γγ/g, "ng"],
  [/(^|[^α-ω])μπ/g, "$1b"],
  [/(^|[^α-ω])ντ/g, "$1d"],
  [/(^|[^α-ω])γκ/g, "$1g"],
];

function romanizeLower(text: string): string {
  let s = text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  for (const [re, to] of DIGRAPHS) s = s.replace(re, to);
  return s.replace(/[α-ως]/g, (ch) => GREEK[ch] ?? "");
}

/** URL slug from a name in Greek or Latin script: "Ελένη Παπά" -> "eleni-papa". */
export function slugify(text: string): string {
  return romanizeLower(text)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

const HAS_GREEK = /[Ͱ-Ͽἀ-῿]/;

/**
 * Latin-script version of a Greek name for non-Greek pages:
 * "Ελένη Παπαδοπούλου" -> "Eleni Papadopoulou". Latin text is returned as is.
 */
export function transliterate(text: string): string {
  if (!HAS_GREEK.test(text)) return text;
  return text
    .split(/(\s+|-)/)
    .map((word) => {
      if (!HAS_GREEK.test(word)) return word;
      const latin = romanizeLower(word);
      return latin.charAt(0).toUpperCase() + latin.slice(1);
    })
    .join("");
}

/** Display name for a locale: Greek pages show the name as written, others in Latin script. */
export function displayName(name: string, locale: string): string {
  return locale === "el" ? name : transliterate(name);
}
