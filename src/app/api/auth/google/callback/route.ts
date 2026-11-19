import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { LEGAL_VERSION } from "@/config/legal";
import { defaultLocale, isLocale } from "@/i18n/config";
import { db } from "@/lib/db";
import { completeSignIn } from "@/lib/auth/complete-sign-in";
import { finishFlow, GOOGLE_COOKIE, googleEnabled, type GoogleFlow, type GoogleIdentity } from "@/lib/auth/google";
import { readValue } from "@/lib/auth/signed-value";

/**
 * Google redirects here. Order of trust: the signed flow cookie must match
 * the state, the ID token must verify, and the email must be verified by
 * Google. Existing accounts are found by Google id, then by email (and
 * linked); new client accounts are created only after explicit consent.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const store = await cookies();
  const flow = readValue<GoogleFlow>("google-oauth", store.get(GOOGLE_COOKIE)?.value);
  store.delete({ name: GOOGLE_COOKIE, path: "/api/auth/google" });
  const locale = flow && isLocale(flow.locale) ? flow.locale : defaultLocale;
  const fail = (reason: string) => redirect(`/${locale}/sign-in?google=${reason}`);

  if (!googleEnabled() || !flow || url.searchParams.get("state") !== flow.state) fail("failed");
  const code = url.searchParams.get("code");
  if (!code) fail(url.searchParams.get("error") === "access_denied" ? "cancelled" : "failed");

  let identity: GoogleIdentity;
  try {
    identity = await finishFlow(code!, flow!.verifier);
  } catch (e) {
    console.error("[auth] Google sign-in failed", e);
    return fail("failed");
  }

  const select = { id: true, role: true, status: true, deletedAt: true, totpEnabledAt: true, googleSub: true } as const;
  let user = (await db.user.findUnique({ where: { googleSub: identity.sub }, select })) ?? (await db.user.findUnique({ where: { email: identity.email }, select }));

  if (user) {
    if (user.status !== "active" || user.deletedAt) return fail("suspended");
    if (user.googleSub && user.googleSub !== identity.sub) return fail("failed");
    if (!user.googleSub) await db.user.update({ where: { id: user.id }, data: { googleSub: identity.sub, emailVerifiedAt: new Date() } });
  } else {
    // No account yet: only create one from the sign-up form, after consent.
    if (flow!.intent !== "signup" || !flow!.consented) redirect(`/${locale}/sign-up?google=noaccount`);
    const userAgent = (await headers()).get("user-agent")?.slice(0, 255) ?? null;
    user = await db.user.create({
      data: {
        email: identity.email,
        name: identity.name.slice(0, 100),
        passwordHash: "!", // no password: Google or magic link only
        googleSub: identity.sub,
        emailVerifiedAt: new Date(),
        role: "client",
        locale,
        clientProfile: { create: {} },
        consents: { create: (["terms", "privacy", "health_data"] as const).map((kind) => ({ kind, version: LEGAL_VERSION, userAgent })) },
      },
      select,
    });
  }
  return completeSignIn(user, locale, flow!.next);
}
