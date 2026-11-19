import "server-only";
import { db } from "@/lib/db";
import type { Locale } from "@/i18n/config";

/**
 * Pricing model. Plans live in the database so admins can change prices,
 * commission and features without a deploy. Every psychologist without an
 * explicit plan is on the default plan.
 */
export const PLAN_FEATURES = ["video", "analytics", "calendar_sync", "featured", "invoicing"] as const;
export type PlanFeature = (typeof PLAN_FEATURES)[number];

export interface PlanInfo {
  id: string;
  slug: string;
  name: string;
  monthlyPriceCents: number;
  commissionBps: number;
  features: PlanFeature[];
  isDefault: boolean;
}

function toInfo(p: { id: string; slug: string; name: unknown; monthlyPriceCents: number; commissionBps: number; features: string[]; isDefault: boolean }, locale: Locale): PlanInfo {
  const names = (p.name ?? {}) as Record<string, string>;
  return {
    id: p.id,
    slug: p.slug,
    name: names[locale] ?? names.en ?? p.slug,
    monthlyPriceCents: p.monthlyPriceCents,
    commissionBps: p.commissionBps,
    features: p.features.filter((f): f is PlanFeature => (PLAN_FEATURES as readonly string[]).includes(f)),
    isDefault: p.isDefault,
  };
}

export async function listPlans(locale: Locale, includeInactive = false): Promise<PlanInfo[]> {
  const rows = await db.plan.findMany({ where: includeInactive ? {} : { active: true }, orderBy: { sortOrder: "asc" } });
  return rows.map((r) => toInfo(r, locale));
}

/** The plan in effect for a psychologist (their own, else the default). */
export async function planFor(psychologistId: string, locale: Locale = "en"): Promise<PlanInfo | null> {
  const p = await db.psychologistProfile.findUnique({ where: { id: psychologistId }, select: { plan: true } });
  const plan = p?.plan?.active ? p.plan : await db.plan.findFirst({ where: { isDefault: true, active: true } });
  return plan ? toInfo(plan, locale) : null;
}

export async function hasFeature(psychologistId: string, feature: PlanFeature): Promise<boolean> {
  return (await planFor(psychologistId))?.features.includes(feature) ?? false;
}

/** Commission on an amount, rounded to the cent. */
export function commissionFor(amountCents: number, bps: number): number {
  return Math.round((amountCents * bps) / 10_000);
}
