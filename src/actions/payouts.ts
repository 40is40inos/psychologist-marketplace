"use server";

import { redirect } from "next/navigation";
import { defaultLocale, isLocale } from "@/i18n/config";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/auth/session";
import { cardPaymentsEnabled, createConnectAccount, onboardingUrl, payoutDashboardUrl } from "@/lib/payments";

/** Start (or resume) Stripe Connect onboarding so card payments are paid out to the psychologist. */
export async function startPayoutSetup(fd: FormData): Promise<void> {
  const user = await assertPermission("pricing.editOwn");
  const l = fd.get("locale");
  const locale = typeof l === "string" && isLocale(l) ? l : defaultLocale;
  if (!cardPaymentsEnabled()) redirect(`/${locale}/dashboard/payments`);

  const profile = await db.psychologistProfile.findUniqueOrThrow({ where: { userId: user.id }, select: { id: true, stripeAccountId: true } });
  let accountId = profile.stripeAccountId;
  if (!accountId) {
    accountId = await createConnectAccount(user.email, profile.id);
    await db.psychologistProfile.update({ where: { id: profile.id }, data: { stripeAccountId: accountId } });
  }
  redirect(await onboardingUrl(accountId, locale));
}

/** Open Stripe's Express dashboard (payout history, bank details, tax forms). */
export async function openPayoutDashboard(fd: FormData): Promise<void> {
  const user = await assertPermission("pricing.editOwn");
  const l = fd.get("locale");
  const locale = typeof l === "string" && isLocale(l) ? l : defaultLocale;
  const profile = await db.psychologistProfile.findUniqueOrThrow({ where: { userId: user.id }, select: { stripeAccountId: true } });
  if (!profile.stripeAccountId || !cardPaymentsEnabled()) redirect(`/${locale}/dashboard/payments`);
  redirect(await payoutDashboardUrl(profile.stripeAccountId));
}
