import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { homePathFor, type Role } from "@/domain/roles";
import type { Locale } from "@/i18n/config";
import { createSession } from "@/lib/auth/session";
import { PENDING_COOKIE, signPending } from "@/lib/auth/two-factor";

/**
 * The last step of every sign-in method (password, magic link, Google).
 * Accounts with 2FA always go through the authenticator step, whichever
 * method proved the first factor. Never returns: it redirects.
 */
export async function completeSignIn(
  user: { id: string; role: Role; totpEnabledAt: Date | null },
  locale: Locale,
  next: string | null,
): Promise<never> {
  if (user.totpEnabledAt) {
    (await cookies()).set(PENDING_COOKIE, signPending(user.id), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 300,
    });
    redirect(`/${locale}/sign-in/verify${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  }
  await createSession(user.id);
  await db.user.update({ where: { id: user.id }, data: { lastSignInAt: new Date() } });
  redirect(next ?? `/${locale}${homePathFor(user.role)}`);
}
