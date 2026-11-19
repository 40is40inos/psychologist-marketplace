import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { Role } from "@/domain/roles";

export const PENDING_COOKIE = "pending_2fa";
const PENDING_TTL_MS = 5 * 60_000;

/** Psychologists and admins must use 2FA (set TWO_FACTOR_ENFORCE=false only for local development). */
export function twoFactorRequired(role: Role): boolean {
  if (process.env.TWO_FACTOR_ENFORCE === "false") return false;
  return role === "psychologist" || role === "admin";
}

function key(): Buffer {
  const raw = process.env.DATA_ENCRYPTION_KEY;
  if (!raw) throw new Error("DATA_ENCRYPTION_KEY is not set");
  // Separate key for signing, derived from the encryption key.
  return createHash("sha256").update(`2fa-pending:${raw}`).digest();
}

/** Short-lived proof that the password step succeeded. */
export function signPending(userId: string): string {
  const payload = `${userId}.${Date.now() + PENDING_TTL_MS}`;
  const sig = createHmac("sha256", key()).update(payload).digest("base64url");
  return `${Buffer.from(payload).toString("base64url")}.${sig}`;
}

export function readPending(token: string | undefined): string | null {
  if (!token) return null;
  const [p, sig] = token.split(".");
  if (!p || !sig) return null;
  const payload = Buffer.from(p, "base64url").toString();
  const expected = createHmac("sha256", key()).update(payload).digest("base64url");
  if (expected.length !== sig.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
  const [userId, exp] = payload.split(".");
  return Number(exp) > Date.now() ? userId : null;
}
