import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Needs a migrated database (CI provides one). Skipped without DATABASE_URL.
describe.skipIf(!process.env.DATABASE_URL)("one-time email links", () => {
  let userId = "";
  const load = async () => ({ ...(await import("@/lib/auth/tokens")), db: (await import("@/lib/db")).db });

  beforeAll(async () => {
    const { db } = await load();
    userId = (await db.user.create({ data: { email: `tokens-${randomUUID()}@example.test`, name: "Token Test", passwordHash: "!" }, select: { id: true } })).id;
  });
  afterAll(async () => {
    const { db } = await load();
    await db.user.delete({ where: { id: userId } });
  });

  it("works exactly once, and only for its own purpose", async () => {
    const { issueToken, spendToken, peekToken } = await load();
    const token = await issueToken(userId, "password_reset");
    expect(await peekToken(token, "password_reset")).toBe(true);
    expect(await spendToken(token, ["sign_in"])).toBeNull();
    expect(await spendToken(token, ["password_reset"])).toMatchObject({ userId, purpose: "password_reset" });
    expect(await spendToken(token, ["password_reset"])).toBeNull();
    expect(await peekToken(token, "password_reset")).toBe(false);
  });

  it("cancels older links of the same purpose", async () => {
    const { issueToken, spendToken } = await load();
    const first = await issueToken(userId, "email_change", "a@example.test");
    const second = await issueToken(userId, "email_change", "b@example.test");
    expect(await spendToken(first, ["email_change"])).toBeNull();
    expect(await spendToken(second, ["email_change"])).toMatchObject({ newEmail: "b@example.test" });
  });

  it("rejects unknown or oversized tokens", async () => {
    const { spendToken } = await load();
    expect(await spendToken("nope", ["sign_in"])).toBeNull();
    expect(await spendToken("x".repeat(500), ["sign_in"])).toBeNull();
  });
});
