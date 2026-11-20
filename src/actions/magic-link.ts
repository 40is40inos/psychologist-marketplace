"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { brand } from "@/config/brand";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { db } from "@/lib/db";
import { completeSignIn } from "@/lib/auth/complete-sign-in";
import { rateLimit } from "@/lib/auth/rate-limit";
import { safeNextPath } from "@/lib/safe-redirect";
import { fill } from "@/lib/format";
import { sendEmail } from "@/lib/notifications/providers";
import { issueToken, spendToken, TOKEN_TTL_MS } from "@/lib/auth/tokens";

const TTL_MS = TOKEN_TTL_MS.sign_in;

export interface MagicLinkState {
  sent?: boolean;
  error?: "invalid" | "rate_limited" | "expired";
}

function localeOf(fd: FormData): Locale {
  const l = fd.get("locale");
  return typeof l === "string" && isLocale(l) ? l : defaultLocale;
}

/**
 * Email a one-time sign-in link. The answer is the same whether or not the
 * address has an account, so the form can't be used to discover who is a
 * client of the platform.
 */
export async function requestMagicLink(_prev: MagicLinkState, fd: FormData): Promise<MagicLinkState> {
  const locale = localeOf(fd);
  const parsed = z.string().trim().toLowerCase().pipe(z.email().max(254)).safeParse(fd.get("email"));
  if (!parsed.success) return { error: "invalid" };
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
  if (!(await rateLimit(`magic:${ip}`, 5, 15 * 60_000)) || !(await rateLimit(`magic:${parsed.data}`, 3, 15 * 60_000))) return { error: "rate_limited" };

  const user = await db.user.findUnique({ where: { email: parsed.data }, select: { id: true, status: true, deletedAt: true, locale: true } });
  if (user && user.status === "active" && !user.deletedAt) {
    const token = await issueToken(user.id, "sign_in");
    const next = safeNextPath(fd.get("next"), locale);
    const url = new URL(`/${locale}/sign-in/link`, brand.siteUrl);
    url.searchParams.set("token", token);
    if (next) url.searchParams.set("next", next);
    const t = (await getDictionary(locale)).magicLink;
    // Neutral wording, like every other email we send.
    await sendEmail({ to: parsed.data, subject: fill(t.emailSubject, { brand: brand.name }), text: fill(t.emailBody, { url: url.toString(), minutes: TTL_MS / 60_000 }) });
  }
  return { sent: true };
}

/** Second step, from the confirmation page: spend the token and sign in. */
export async function consumeMagicLink(_prev: MagicLinkState, fd: FormData): Promise<MagicLinkState> {
  const locale = localeOf(fd);
  // Atomic: only one request can spend an unused, unexpired sign-in link.
  const record = await spendToken(String(fd.get("token") ?? ""), ["sign_in"]);
  if (!record) return { error: "expired" };

  const user = await db.user.update({
    where: { id: record.userId },
    // Clicking the link proves the person controls the address.
    data: { emailVerifiedAt: new Date() },
    select: { id: true, role: true, status: true, deletedAt: true, totpEnabledAt: true },
  });
  if (user.status !== "active" || user.deletedAt) return { error: "expired" };
  return completeSignIn(user, locale, safeNextPath(fd.get("next"), locale));
}
