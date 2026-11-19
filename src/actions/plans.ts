"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/auth/session";
import { PLAN_FEATURES } from "@/lib/plans";

/** A psychologist switches plan. Billing for paid plans is handled once card payments exist. */
export async function choosePlan(fd: FormData): Promise<void> {
  const user = await assertPermission("pricing.editOwn");
  const planId = z.string().min(1).parse(fd.get("planId"));
  const plan = await db.plan.findFirst({ where: { id: planId, active: true }, select: { id: true } });
  if (!plan) return;
  await db.psychologistProfile.update({ where: { userId: user.id }, data: { planId: plan.id, planStartedAt: new Date() } });
  refresh();
}

export interface PlanState {
  ok?: boolean;
  error?: string;
  at?: number;
}

const planSchema = z.object({
  id: z.string().optional(),
  slug: z.string().trim().regex(/^[a-z0-9-]{2,30}$/),
  name_el: z.string().trim().min(1).max(60),
  name_en: z.string().trim().min(1).max(60),
  price: z.coerce.number().min(0).max(1000),
  commission: z.coerce.number().min(0).max(50),
  sortOrder: z.coerce.number().int().min(0).max(100).default(0),
});

/** Admin: create or update a plan. Prices and commission are configurable without a deploy. */
export async function savePlan(_p: PlanState, fd: FormData): Promise<PlanState> {
  const admin = await assertPermission("users.manage");
  const parsed = planSchema.safeParse({ ...Object.fromEntries(fd), id: fd.get("id") || undefined });
  if (!parsed.success) return { error: "invalid", at: Date.now() };
  const d = parsed.data;
  const features = fd.getAll("features").map(String).filter((f) => (PLAN_FEATURES as readonly string[]).includes(f));
  const data = {
    slug: d.slug,
    name: { el: d.name_el, en: d.name_en },
    monthlyPriceCents: Math.round(d.price * 100),
    commissionBps: Math.round(d.commission * 100),
    features,
    active: fd.get("active") === "on",
    isDefault: fd.get("isDefault") === "on",
    sortOrder: d.sortOrder,
  };

  try {
    await db.$transaction(async (tx) => {
    if (data.isDefault) await tx.plan.updateMany({ where: { isDefault: true, NOT: d.id ? { id: d.id } : undefined }, data: { isDefault: false } });
    const plan = d.id ? await tx.plan.update({ where: { id: d.id }, data }) : await tx.plan.create({ data });
    await tx.auditLog.create({
      data: { actorId: admin.id, action: "plan.save", targetType: "Plan", targetId: plan.id, metadata: { name: d.name_en, priceCents: data.monthlyPriceCents, commissionBps: data.commissionBps } },
    });
    });
  } catch {
    // Most likely a duplicate code (slug).
    return { error: "invalid", at: Date.now() };
  }
  updateTag("plans");
  refresh();
  return { ok: true, at: Date.now() };
}
