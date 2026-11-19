import "server-only";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, type CurrentUser } from "@/lib/auth/session";
import type { Locale } from "@/i18n/config";

/** The signed-in psychologist and their profile id, for workspace pages. */
export async function requirePsychologist(locale: Locale, returnTo: string): Promise<{ user: CurrentUser; profileId: string }> {
  const user = await requireRole(locale, "psychologist", returnTo);
  const profile = await db.psychologistProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
  if (!profile) notFound();
  return { user, profileId: profile.id };
}
