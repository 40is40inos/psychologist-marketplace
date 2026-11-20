import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

// Needs a migrated database (CI provides one). Skipped without DATABASE_URL.
describe.skipIf(!process.env.DATABASE_URL)("rateLimit (Postgres)", () => {
  it("allows up to the limit, then blocks, shared across calls", async () => {
    const { rateLimit } = await import("@/lib/auth/rate-limit");
    const key = `test:${randomUUID()}`;
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await rateLimit(key, 3, 60_000));
    expect(results).toEqual([true, true, true, false]);
  });

  it("starts a new window once the old one has expired", async () => {
    const { rateLimit } = await import("@/lib/auth/rate-limit");
    const key = `test:${randomUUID()}`;
    expect(await rateLimit(key, 1, 50)).toBe(true);
    await new Promise((r) => setTimeout(r, 120));
    expect(await rateLimit(key, 1, 50)).toBe(true);
  });
});
