import "server-only";
import { db } from "@/lib/db";

/**
 * Postgres full-text search over profile text (headline, bio, approach) in
 * every language. The expression below must stay identical to the GIN index
 * in prisma/migrations/20261121100000_stack so Postgres can use it.
 *
 * "simple" (no stemming) + lower-casing + Greek accent folding works for both
 * Greek and English; prefix matching ("θερα" finds "θεραπεία") covers word
 * endings. Swap in Meilisearch/Algolia later behind this same function.
 */
const ACCENTED = "άέήίόύώϊϋΐΰς";
const PLAIN = "αεηιουωιυιυσ";

export function foldText(s: string): string {
  let out = s.toLowerCase().normalize("NFC");
  for (let i = 0; i < ACCENTED.length; i++) out = out.replaceAll(ACCENTED[i], PLAIN[i]);
  return out;
}

/** "Panic attacks, θεραπεία" -> "panic:* & attacks:* & θεραπεια:*" (letters and digits only, so input can't inject syntax). */
export function toPrefixQuery(q: string): string | null {
  const terms = foldText(q).match(/[\p{L}\p{N}]{2,}/gu)?.slice(0, 8) ?? [];
  return terms.length ? terms.map((t) => `${t}:*`).join(" & ") : null;
}

/** Profile ids whose text matches every term, best match first. */
export async function searchProfileText(q: string): Promise<string[]> {
  const query = toPrefixQuery(q);
  if (!query) return [];
  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT "psychologistId" AS id, max(ts_rank(doc, query)) AS rank
    FROM "PsychologistProfileTranslation",
         to_tsvector('simple', translate(lower("headline" || ' ' || "bio" || ' ' || coalesce("approach", '')), ${ACCENTED}, ${PLAIN})) AS doc,
         to_tsquery('simple', ${query}) AS query
    WHERE doc @@ query
    GROUP BY "psychologistId"
    ORDER BY rank DESC
    LIMIT 200`;
  return rows.map((r) => r.id);
}
