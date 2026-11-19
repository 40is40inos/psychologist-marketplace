"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { brand } from "@/config/brand";
import { rateLimit } from "@/lib/auth/rate-limit";
import { sendEmail } from "@/lib/notifications/providers";
import { CONTACT_TOPICS } from "@/domain/contact";

export interface ContactState {
  ok?: boolean;
  error?: "invalid" | "rate_limited";
  at?: number;
}

const schema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  topic: z.enum(CONTACT_TOPICS),
  message: z.string().trim().min(5).max(4000),
});

/**
 * Contact form: emailed to support, nothing stored. A hidden "website" field
 * catches simple bots; a per-IP limit stops floods.
 */
export async function sendContact(_prev: ContactState, fd: FormData): Promise<ContactState> {
  // Bots fill every field; people never see this one. Pretend it worked.
  if (fd.get("website")) return { ok: true, at: Date.now() };
  const parsed = schema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: "invalid", at: Date.now() };

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
  if (!rateLimit(`contact:${ip}`, 5, 60 * 60_000)) return { error: "rate_limited", at: Date.now() };

  const d = parsed.data;
  await sendEmail({
    to: brand.supportEmail,
    subject: `[Contact: ${d.topic}] ${d.name}`,
    text: `From: ${d.name} <${d.email}>\nTopic: ${d.topic}\n\n${d.message}`,
  });
  return { ok: true, at: Date.now() };
}
