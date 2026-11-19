"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { defaultLocale, isLocale } from "@/i18n/config";
import { safeNextPath } from "@/lib/safe-redirect";

function localeOf(formData: FormData) {
  const l = formData.get("locale");
  return typeof l === "string" && isLocale(l) ? l : defaultLocale;
}

/** Save or unsave a psychologist. Signed-out visitors go to sign-in first. */
export async function toggleSaved(formData: FormData): Promise<void> {
  const locale = localeOf(formData);
  const user = await getCurrentUser();
  const back = safeNextPath(formData.get("returnTo"), locale) ?? `/${locale}/psychologists`;
  if (!user) redirect(`/${locale}/sign-in?next=${encodeURIComponent(back)}`);
  if (user.role !== "client") return;

  const slug = z.string().min(1).max(80).parse(formData.get("slug"));
  const profile = await db.psychologistProfile.findUnique({ where: { slug }, select: { id: true } });
  if (!profile) return;

  const key = { userId_psychologistId: { userId: user.id, psychologistId: profile.id } };
  const existing = await db.savedPsychologist.findUnique({ where: key });
  if (existing) await db.savedPsychologist.delete({ where: key });
  else await db.savedPsychologist.create({ data: { userId: user.id, psychologistId: profile.id } });
  refresh();
}
