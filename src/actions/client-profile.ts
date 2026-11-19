"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { SESSION_TYPES } from "@/domain/session-types";
import { defaultLocale, isLocale } from "@/i18n/config";
import { requireRole } from "@/lib/auth/session";
import { encrypt } from "@/lib/crypto";
import { db } from "@/lib/db";
import { parseAnswers } from "@/lib/matching";

export interface PrefsState {
  ok?: boolean;
  error?: string;
  at?: number;
}

function localeOf(fd: FormData) {
  const l = fd.get("locale");
  return typeof l === "string" && isLocale(l) ? l : defaultLocale;
}

/** Preferred session language and format, used as defaults when searching. */
export async function savePreferences(_prev: PrefsState, fd: FormData): Promise<PrefsState> {
  const locale = localeOf(fd);
  const user = await requireRole(locale, "client", `/${locale}/account/settings`);
  const parsed = z
    .object({ preferredLanguage: z.string().trim().max(10).default(""), preferredSessionType: z.enum(["", ...SESSION_TYPES]).default("") })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: "invalid", at: Date.now() };
  const lang = parsed.data.preferredLanguage
    ? await db.language.findFirst({ where: { code: parsed.data.preferredLanguage, active: true }, select: { code: true } })
    : null;
  const data = { preferredLanguage: lang?.code ?? null, preferredSessionType: parsed.data.preferredSessionType || null };
  await db.clientProfile.upsert({ where: { userId: user.id }, create: { userId: user.id, ...data }, update: data });
  refresh();
  return { ok: true, at: Date.now() };
}

/**
 * Keep "Help me choose" answers so the client can come back to their matches.
 * Encrypted (concerns are health data) and never put in a URL afterwards:
 * the results page reads them from the profile.
 */
export async function saveMatchAnswers(fd: FormData): Promise<void> {
  const locale = localeOf(fd);
  const user = await requireRole(locale, "client", `/${locale}/match`);
  const query = String(fd.get("answers") ?? "").slice(0, 2000);
  const params = new URLSearchParams(query);
  params.delete("support");
  const record: Record<string, string[]> = {};
  for (const [k, v] of params) (record[k] ??= []).push(v);
  if (!parseAnswers(record)) redirect(`/${locale}/match`);
  const data = { matchAnswersEncrypted: encrypt(params.toString()), matchSavedAt: new Date() };
  await db.clientProfile.upsert({ where: { userId: user.id }, create: { userId: user.id, ...data }, update: data });
  redirect(`/${locale}/match/results?saved=1`);
}

export async function forgetMatchAnswers(fd: FormData): Promise<void> {
  const locale = localeOf(fd);
  const user = await requireRole(locale, "client", `/${locale}/account`);
  await db.clientProfile.updateMany({ where: { userId: user.id }, data: { matchAnswersEncrypted: null, matchSavedAt: null } });
  refresh();
}
