/**
 * Detects free text that may indicate risk of suicide or self-harm, in Greek
 * or English, so crisis resources can be shown immediately. Deliberately
 * sensitive: a false positive only shows helpline numbers, while a miss could
 * leave someone without support. This is a safety prompt, not an assessment.
 * Runs on both client and server (no dependencies).
 */
const PATTERNS: RegExp[] = [
  // English
  /\bsuicid/,
  /\bkill(ing)? myself\b/,
  /\bend(ing)? (my|it all|my own) li(fe|ves)\b/,
  /\bend it all\b/,
  /\b(want|wanna|wish) to die\b/,
  /\bbetter off dead\b/,
  /\bno (reason|point) (to|in) liv/,
  /\bself[- ]?harm/,
  /\b(cut|cutting|hurt|hurting|harm|harming) myself\b/,
  /\boverdos/,
  /\bdon'?t want to (live|be alive|wake up)\b/,
  // Greek (accents removed before matching)
  /αυτοκτον/,
  /αυτοτραυματ/,
  /αυτοκαταστροφ/,
  /(θελω|θα ηθελα|σκεφτομαι|σκεφτηκα) να πεθανω/,
  /να (σκοτωσω|τελειωσω) (τον εαυτο μου|με τον εαυτο μου)/,
  /τελος στη ζωη/,
  /να μην ξυπνησω/,
  /δεν (αξιζει|εχει νοημα) να ζω/,
  /(κοβω|εκοψα|χτυπαω|βλαπτω|πληγωνω) τον εαυτο μου/,
  /να βλαψω τον εαυτο μου/,
];

function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/\s+/g, " ");
}

export function suggestsRisk(...texts: (string | null | undefined)[]): boolean {
  const t = normalize(texts.filter(Boolean).join(" \n "));
  return t.length > 0 && PATTERNS.some((p) => p.test(t));
}
