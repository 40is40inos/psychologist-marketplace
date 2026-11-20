"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { getCurrentUser } from "@/lib/auth/session";
import { rateLimit } from "@/lib/auth/rate-limit";
import { defaultLocale, isLocale } from "@/i18n/config";
import { policy } from "@/config/policy";

export interface SimpleState {
  ok?: boolean;
  error?: string;
  at?: number;
}

function localeOf(fd: FormData) {
  const l = fd.get("locale");
  return typeof l === "string" && isLocale(l) ? l : defaultLocale;
}

async function requireUser(fd: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect(`/${localeOf(fd)}/sign-in`);
  return user;
}

// ─── Feedback ───────────────────────────────────────────────────────────────

const feedbackSchema = z.object({
  appointmentId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).default(""),
});

/** Private feedback on a completed session. One per session, client only. */
export async function submitFeedback(_prev: SimpleState, fd: FormData): Promise<SimpleState> {
  const user = await requireUser(fd);
  const parsed = feedbackSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: "invalid", at: Date.now() };
  const { appointmentId, rating, comment } = parsed.data;

  const a = await db.appointment.findFirst({
    where: { id: appointmentId, clientId: user.id, status: "completed", kind: "session", feedback: null },
    select: { id: true, psychologistId: true },
  });
  if (!a) return { error: "not_allowed", at: Date.now() };

  await db.feedback.create({
    data: {
      appointmentId: a.id,
      clientId: user.id,
      psychologistId: a.psychologistId,
      rating,
      comment: comment || null,
      publicConsent: policy.publicTestimonials && fd.get("publicConsent") === "on",
    },
  });
  refresh();
  return { ok: true, at: Date.now() };
}

// ─── Messages ───────────────────────────────────────────────────────────────

const messageSchema = z.object({
  conversationId: z.string().min(1),
  body: z.string().trim().min(1).max(4000),
});

export async function sendMessage(_prev: SimpleState, fd: FormData): Promise<SimpleState> {
  const user = await requireUser(fd);
  const parsed = messageSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: "invalid", at: Date.now() };
  if (!(await rateLimit(`msg:${user.id}`, 30, 60_000))) return { error: "rate_limited", at: Date.now() };

  const c = await db.conversation.findUnique({
    where: { id: parsed.data.conversationId },
    select: { id: true, clientId: true, psychologist: { select: { userId: true } } },
  });
  if (!c || (c.clientId !== user.id && c.psychologist.userId !== user.id)) return { error: "not_allowed", at: Date.now() };

  await db.$transaction([
    db.message.create({ data: { conversationId: c.id, senderId: user.id, bodyEncrypted: encrypt(parsed.data.body) } }),
    db.conversation.update({ where: { id: c.id }, data: { lastMessageAt: new Date() } }),
  ]);
  refresh();
  return { ok: true, at: Date.now() };
}

// ─── Reminder settings ──────────────────────────────────────────────────────

const settingsSchema = z.object({
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s()-]/g, ""))
    .pipe(z.union([z.literal(""), z.string().regex(/^\+?[1-9]\d{7,14}$/)])),
});

export async function saveReminderSettings(_prev: SimpleState, fd: FormData): Promise<SimpleState> {
  const user = await requireUser(fd);
  const parsed = settingsSchema.safeParse({ phone: fd.get("phone") ?? "" });
  const smsReminders = fd.get("smsReminders") === "on";
  if (!parsed.success || (smsReminders && !parsed.data.phone)) return { error: "phone", at: Date.now() };

  // Greek mobiles typed without a country code get +30.
  const phone = parsed.data.phone && !parsed.data.phone.startsWith("+") ? `+30${parsed.data.phone}` : parsed.data.phone;
  await db.user.update({
    where: { id: user.id },
    data: { phone: phone || null, smsReminders, emailReminders: fd.get("emailReminders") === "on", smsHideBrand: fd.get("smsHideBrand") === "on" },
  });
  refresh();
  return { ok: true, at: Date.now() };
}
