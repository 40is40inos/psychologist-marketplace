import "server-only";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";

/**
 * Fixed-window rate limiter stored in Postgres, so every serverless instance
 * shares the same counters. One atomic upsert per check. Keys often contain
 * an IP or email address, so only their SHA-256 hash is stored.
 *
 * Returns true while the caller is within `limit` attempts per window.
 * If the database is unreachable the request is allowed (fail open) and the
 * error logged: a database outage should not lock everyone out.
 */
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const id = createHash("sha256").update(key).digest("base64url");
  try {
    const rows = await db.$queryRaw<{ count: number }[]>`
      INSERT INTO "RateLimit" ("key", "count", "resetAt")
      VALUES (${id}, 1, now() + ${windowMs} * interval '1 millisecond')
      ON CONFLICT ("key") DO UPDATE SET
        "count"   = CASE WHEN "RateLimit"."resetAt" <= now() THEN 1 ELSE "RateLimit"."count" + 1 END,
        "resetAt" = CASE WHEN "RateLimit"."resetAt" <= now() THEN EXCLUDED."resetAt" ELSE "RateLimit"."resetAt" END
      RETURNING "count"`;
    return Number(rows[0]?.count ?? 1) <= limit;
  } catch (e) {
    console.error("[rate-limit] check failed, allowing request", e);
    return true;
  }
}
