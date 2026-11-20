import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import type { TokenPurpose } from "@/generated/prisma/client";

/**
 * One-time links sent by email. The raw token only ever lives in the email;
 * the database keeps its SHA-256 hash. Each purpose is spent only by its own
 * flow, so a sign-in link can't reset a password and vice versa.
 */
export const TOKEN_TTL_MS: Record<TokenPurpose, number> = {
  sign_in: 15 * 60_000,
  password_reset: 30 * 60_000,
  email_verify: 48 * 3_600_000,
  email_change: 24 * 3_600_000,
};

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** Issue a new link. Older unused links of the same purpose stop working. */
export async function issueToken(userId: string, purpose: TokenPurpose, newEmail?: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  await db.$transaction([
    ...(purpose === "sign_in" ? [] : [db.loginToken.updateMany({ where: { userId, purpose, usedAt: null }, data: { usedAt: now } })]),
    db.loginToken.create({
      data: { tokenHash: hashToken(token), userId, purpose, newEmail: newEmail ?? null, expiresAt: new Date(now.getTime() + TOKEN_TTL_MS[purpose]) },
    }),
  ]);
  return token;
}

/**
 * Spend a link: returns its record if it was valid, unused, unexpired and
 * for one of the given purposes. Atomic, so a link works exactly once.
 */
export async function spendToken(token: string, purposes: TokenPurpose[]): Promise<{ userId: string; purpose: TokenPurpose; newEmail: string | null } | null> {
  if (!token || token.length > 100) return null;
  const record = await db.loginToken.findUnique({ where: { tokenHash: hashToken(token) }, select: { id: true, userId: true, purpose: true, newEmail: true } });
  if (!record || !purposes.includes(record.purpose)) return null;
  const spent = await db.loginToken.updateMany({ where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
  return spent.count === 1 ? { userId: record.userId, purpose: record.purpose, newEmail: record.newEmail } : null;
}

/** Check a link without spending it (to show the right form). Callers in
 * pages must be dynamic (await connection()): the answer depends on the time. */
export async function peekToken(token: string, purpose: TokenPurpose): Promise<boolean> {
  if (!token || token.length > 100) return false;
  return (await db.loginToken.count({ where: { tokenHash: hashToken(token), purpose, usedAt: null, expiresAt: { gt: new Date() } } })) === 1;
}
