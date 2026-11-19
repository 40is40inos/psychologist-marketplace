"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/auth/session";
import { LANGUAGE_RE, SLUG_RE } from "@/domain/taxonomy";
import { defaultLocale, isLocale } from "@/i18n/config";

export interface AdminState {
  ok?: boolean;
  error?: string;
  at?: number;
}
const ok = (): AdminState => ({ ok: true, at: Date.now() });
const fail = (error: string): AdminState => ({ error, at: Date.now() });

function audit(tx: Prisma.TransactionClient, actorId: string, action: string, targetType: string, targetId: string, metadata?: Prisma.InputJsonValue) {
  return tx.auditLog.create({ data: { actorId, action, targetType, targetId, metadata } });
}

// ─── Refunds ────────────────────────────────────────────────────────────────

const refundSchema = z.object({
  paymentId: z.string().min(1),
  amount: z.coerce.number().positive().max(10_000),
  reason: z.string().trim().min(3).max(500),
});

/**
 * Record a (partial or full) refund. With card payments enabled this is also
 * where the provider refund is triggered; for payments taken at the session
 * the psychologist pays the client back and this keeps the books straight.
 */
export async function refundPayment(_p: AdminState, fd: FormData): Promise<AdminState> {
  const admin = await assertPermission("payments.refund");
  const parsed = refundSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return fail(fd.get("reason") ? "invalid" : "reason");
  const cents = Math.round(parsed.data.amount * 100);

  const done = await db.$transaction(async (tx) => {
    const pay = await tx.payment.findUnique({ where: { id: parsed.data.paymentId }, include: { appointment: { select: { client: { select: { name: true } } } } } });
    if (!pay || pay.status !== "paid") return "invalid";
    if (pay.refundedCents + cents > pay.amountCents) return "tooMuch";
    const total = pay.refundedCents + cents;
    await tx.payment.update({
      where: { id: pay.id },
      data: {
        refundedCents: total,
        refundedAt: new Date(),
        refundReason: parsed.data.reason,
        // A full refund also returns the platform fee.
        ...(total === pay.amountCents && { status: "refunded", commissionCents: 0 }),
      },
    });
    await audit(tx, admin.id, "payment.refund", "Payment", pay.id, { name: pay.appointment.client.name, cents, reason: parsed.data.reason });
    return "ok";
  });
  if (done !== "ok") return fail(done);
  refresh();
  return ok();
}

// ─── Review moderation ──────────────────────────────────────────────────────

export async function moderateReview(fd: FormData): Promise<void> {
  const admin = await assertPermission("content.moderate");
  const { id, decision, note } = z
    .object({ id: z.string().min(1), decision: z.enum(["approved", "rejected"]), note: z.string().trim().max(300).optional() })
    .parse(Object.fromEntries(fd));
  const f = await db.feedback.findUnique({ where: { id }, select: { publicConsent: true, psychologist: { select: { slug: true } } } });
  if (!f) return;
  // Never publish feedback the client didn't agree to share.
  const status = decision === "approved" && !f.publicConsent ? "rejected" : decision;
  await db.$transaction(async (tx) => {
    await tx.feedback.update({ where: { id }, data: { moderationStatus: status, moderationNote: note || null, moderatedAt: new Date(), moderatedById: admin.id } });
    await audit(tx, admin.id, status === "approved" ? "review.approve" : "review.reject", "Feedback", id);
  });
  updateTag(`profile:${f.psychologist.slug}`);
  refresh();
}

// ─── Taxonomy ───────────────────────────────────────────────────────────────

const labelsFrom = (fd: FormData) => ({ el: String(fd.get("label_el") ?? "").trim().slice(0, 80), en: String(fd.get("label_en") ?? "").trim().slice(0, 80) });

export async function saveSpecialty(_p: AdminState, fd: FormData): Promise<AdminState> {
  const admin = await assertPermission("taxonomy.manage");
  const id = String(fd.get("id") ?? "");
  const labels = labelsFrom(fd);
  const sortOrder = Math.max(0, Math.min(999, Number(fd.get("sortOrder") ?? 0) || 0));
  const active = fd.get("active") === "on";
  if (!labels.el || !labels.en) return fail("invalid");

  let target = id;
  if (id) {
    await db.specialty.update({ where: { id }, data: { labels, sortOrder, active } });
  } else {
    const slug = String(fd.get("slug") ?? "").trim();
    const kind = z.enum(["concern", "approach", "client_type"]).safeParse(fd.get("kind"));
    if (!SLUG_RE.test(slug) || !kind.success) return fail("invalid");
    if (await db.specialty.findUnique({ where: { slug } })) return fail("invalid");
    target = (await db.specialty.create({ data: { slug, kind: kind.data, labels, sortOrder, active } })).id;
  }
  await db.auditLog.create({ data: { actorId: admin.id, action: "taxonomy.save", targetType: "Specialty", targetId: target, metadata: { name: labels.en } } });
  updateTag("taxonomy");
  refresh();
  return ok();
}

export async function saveLanguage(_p: AdminState, fd: FormData): Promise<AdminState> {
  const admin = await assertPermission("taxonomy.manage");
  const code = String(fd.get("code") ?? "").trim().toLowerCase();
  const labels = labelsFrom(fd);
  if (!LANGUAGE_RE.test(code) || !labels.el || !labels.en) return fail("invalid");
  const data = { labels, sortOrder: Math.max(0, Number(fd.get("sortOrder") ?? 0) || 0), active: fd.get("active") === "on" };
  await db.language.upsert({ where: { code }, create: { code, ...data }, update: data });
  await db.auditLog.create({ data: { actorId: admin.id, action: "taxonomy.save", targetType: "Language", targetId: code, metadata: { name: labels.en } } });
  updateTag("taxonomy");
  refresh();
  return ok();
}

// ─── Content (blog + pages) ─────────────────────────────────────────────────

const contentSchema = z.object({
  id: z.string().optional(),
  kind: z.enum(["article", "page"]),
  slug: z.string().trim().regex(/^[a-z0-9-]{2,80}$/),
  coverUrl: z.union([z.literal(""), z.url().max(500)]),
});

export async function saveContent(_p: AdminState, fd: FormData): Promise<AdminState> {
  const admin = await assertPermission("content.manage");
  const parsed = contentSchema.safeParse({ ...Object.fromEntries(fd), id: fd.get("id") || undefined, coverUrl: fd.get("coverUrl") ?? "" });
  if (!parsed.success) return fail("invalid");
  const d = parsed.data;
  const translations = (["el", "en"] as const)
    .map((locale) => ({
      locale,
      title: String(fd.get(`title_${locale}`) ?? "").trim().slice(0, 200),
      excerpt: String(fd.get(`excerpt_${locale}`) ?? "").trim().slice(0, 500) || null,
      body: String(fd.get(`body_${locale}`) ?? "").slice(0, 100_000),
    }))
    .filter((t) => t.title && t.body.trim());
  if (translations.length === 0) return fail("invalid");
  const published = fd.get("published") === "on";

  let id = d.id;
  try {
    await db.$transaction(async (tx) => {
      const existing = id ? await tx.contentPage.findUnique({ where: { id }, select: { publishedAt: true } }) : null;
      const data = {
        kind: d.kind,
        slug: d.slug,
        coverUrl: d.coverUrl || null,
        status: published ? ("published" as const) : ("draft" as const),
        publishedAt: published ? (existing?.publishedAt ?? new Date()) : null,
      };
      const page = id ? await tx.contentPage.update({ where: { id }, data }) : await tx.contentPage.create({ data: { ...data, authorId: admin.id } });
      id = page.id;
      await tx.contentTranslation.deleteMany({ where: { pageId: page.id } });
      await tx.contentTranslation.createMany({ data: translations.map((t) => ({ pageId: page.id, ...t })) });
      await audit(tx, admin.id, "content.save", "ContentPage", page.id, { name: translations[0].title });
    });
  } catch {
    return fail("invalid"); // usually a duplicate slug
  }
  updateTag("content");
  const l = fd.get("locale");
  redirect(`/${typeof l === "string" && isLocale(l) ? l : defaultLocale}/admin/content/${id}?saved=1`);
}

export async function deleteContent(fd: FormData): Promise<void> {
  const admin = await assertPermission("content.manage");
  const id = z.string().min(1).parse(fd.get("id"));
  const page = await db.contentPage.findUnique({ where: { id }, include: { translations: { take: 1 } } });
  if (page) {
    await db.$transaction(async (tx) => {
      await tx.contentPage.delete({ where: { id } });
      await audit(tx, admin.id, "content.delete", "ContentPage", id, { name: page.translations[0]?.title ?? page.slug });
    });
    updateTag("content");
  }
  const l = fd.get("locale");
  redirect(`/${typeof l === "string" && isLocale(l) ? l : defaultLocale}/admin/content`);
}
