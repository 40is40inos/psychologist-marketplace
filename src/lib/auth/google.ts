import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { brand } from "@/config/brand";

/**
 * "Sign in with Google" (OpenID Connect, authorisation code flow with PKCE).
 * Enabled only when GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set.
 * Redirect URI to register in Google Cloud: <site>/api/auth/google/callback
 */
const JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export const GOOGLE_COOKIE = "google_oauth";

export interface GoogleFlow {
  state: string;
  verifier: string;
  intent: "signin" | "signup";
  locale: string;
  next: string | null;
  /** Sign-up only: the terms and the explicit health-data consent were ticked. */
  consented: boolean;
}

export function googleEnabled(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function redirectUri(): string {
  return new URL("/api/auth/google/callback", brand.siteUrl).toString();
}

export function newFlow(intent: GoogleFlow["intent"], locale: string, next: string | null, consented: boolean): GoogleFlow {
  return { state: randomBytes(16).toString("base64url"), verifier: randomBytes(32).toString("base64url"), intent, locale, next, consented };
}

export function authorizeUrl(flow: GoogleFlow): string {
  const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  u.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!);
  u.searchParams.set("redirect_uri", redirectUri());
  u.searchParams.set("response_type", "code");
  // Minimal scopes: identity and email only.
  u.searchParams.set("scope", "openid email profile");
  u.searchParams.set("state", flow.state);
  u.searchParams.set("code_challenge", createHash("sha256").update(flow.verifier).digest("base64url"));
  u.searchParams.set("code_challenge_method", "S256");
  u.searchParams.set("prompt", "select_account");
  return u.toString();
}

export interface GoogleIdentity {
  sub: string;
  email: string;
  name: string;
}

/** Exchange the code and verify the ID token (signature, issuer, audience, expiry). */
export async function finishFlow(code: string, verifier: string): Promise<GoogleIdentity> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      code_verifier: verifier,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed (${res.status})`);
  const { id_token } = (await res.json()) as { id_token?: string };
  if (!id_token) throw new Error("No ID token from Google");
  const { payload } = await jwtVerify(id_token, JWKS, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: process.env.GOOGLE_CLIENT_ID!,
  });
  // Only trust addresses Google has verified, or accounts could be taken over.
  if (typeof payload.sub !== "string" || typeof payload.email !== "string" || payload.email_verified !== true) {
    throw new Error("Google account email is not verified");
  }
  return { sub: payload.sub, email: payload.email.toLowerCase(), name: typeof payload.name === "string" ? payload.name : payload.email.split("@")[0] };
}
