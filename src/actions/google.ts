"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { defaultLocale, isLocale } from "@/i18n/config";
import { authorizeUrl, GOOGLE_COOKIE, googleEnabled, newFlow } from "@/lib/auth/google";
import { signValue } from "@/lib/auth/signed-value";
import { safeNextPath } from "@/lib/safe-redirect";

/**
 * Start "Continue with Google". For a new account the person must first tick
 * the terms and the explicit health-data consent on the sign-up form; that
 * choice travels in the signed, short-lived flow cookie.
 */
export async function startGoogle(fd: FormData): Promise<void> {
  const l = fd.get("locale");
  const locale = typeof l === "string" && isLocale(l) ? l : defaultLocale;
  if (!googleEnabled()) redirect(`/${locale}/sign-in`);
  const intent = fd.get("intent") === "signup" ? "signup" : "signin";
  const consented = intent === "signup" && fd.get("consent") === "on" && fd.get("healthConsent") === "on";
  if (intent === "signup" && !consented) redirect(`/${locale}/sign-up?google=consent`);

  const flow = newFlow(intent, locale, safeNextPath(fd.get("next"), locale), consented);
  (await cookies()).set(GOOGLE_COOKIE, signValue("google-oauth", flow, 10 * 60_000), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // Lax: the cookie must come back on Google's top-level redirect.
    sameSite: "lax",
    path: "/api/auth/google",
    maxAge: 600,
  });
  redirect(authorizeUrl(flow));
}
