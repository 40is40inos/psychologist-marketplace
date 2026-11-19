import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * Tamper-proof, expiring values for short-lived cookies (e.g. the OAuth
 * state). HMAC-SHA256 with a key derived per purpose from DATA_ENCRYPTION_KEY.
 */
function key(purpose: string): Buffer {
  const raw = process.env.DATA_ENCRYPTION_KEY;
  if (!raw) throw new Error("DATA_ENCRYPTION_KEY is not set");
  return createHash("sha256").update(`${purpose}:${raw}`).digest();
}

export function signValue<T>(purpose: string, value: T, ttlMs: number): string {
  const payload = Buffer.from(JSON.stringify({ v: value, exp: Date.now() + ttlMs })).toString("base64url");
  const sig = createHmac("sha256", key(purpose)).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function readValue<T>(purpose: string, token: string | undefined): T | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = createHmac("sha256", key(purpose)).update(payload).digest("base64url");
  if (expected.length !== sig.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as { v: T; exp: number };
    return data.exp > Date.now() ? data.v : null;
  } catch {
    return null;
  }
}
