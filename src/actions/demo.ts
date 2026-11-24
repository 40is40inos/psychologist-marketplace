"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { demo, DEMO_ACCOUNTS, DEMO_ROLES, isDemoAccount, type DemoRole } from "@/config/demo";
import { homePathFor } from "@/domain/roles";
import { defaultLocale, isLocale } from "@/i18n/config";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/auth/rate-limit";
import { createSession, destroySession } from "@/lib/auth/session";
import { refreshDemoBookings } from "@/lib/demo-data";

/**
 * Demo only: sign in as a seeded demo account with one click. The account is
 * put back in a usable state first (active, no 2FA) in case a previous
 * visitor changed it.
 */
export async function demoSignIn(fd: FormData): Promise<void> {
  const l = fd.get("locale");
  const locale = typeof l === "string" && isLocale(l) ? l : defaultLocale;
  const role = String(fd.get("role")) as DemoRole;
  if (!demo.enabled || !DEMO_ROLES.includes(role)) redirect(`/${locale}`);

  const email = DEMO_ACCOUNTS[role];
  if (!isDemoAccount(email)) redirect(`/${locale}/demo?unavailable=1`);
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!(await rateLimit(`demo:${ip}`, 30, 10 * 60_000))) redirect(`/${locale}/demo?busy=1`);

  const user = await db.user.findUnique({ where: { email }, select: { id: true, role: true } });
  if (!user || user.role !== role) redirect(`/${locale}/demo?unavailable=1`);
  await db.user.update({
    where: { id: user.id },
    data: { status: "active", deletedAt: null, totpEnabledAt: null, totpSecretEncrypted: null, recoveryCodeHashes: [] },
  });
  // Seeded bookings drift into the past between deploys; keep some ahead.
  if (role !== "admin") await refreshDemoBookings().catch((e) => console.error("[demo] refresh failed", e));
  await destroySession();
  await createSession(user.id);
  redirect(`/${locale}${homePathFor(user.role)}`);
}
