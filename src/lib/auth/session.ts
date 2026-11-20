import "server-only";
import { connection } from "next/server";
import { cache } from "react";
import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can, homePathFor, type Permission, type Role } from "@/domain/roles";
import type { Locale } from "@/i18n/config";
import { SESSION_COOKIE, SESSION_TTL_MS } from "./constants";
import { twoFactorRequired } from "./two-factor";

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  locale: Locale;
  twoFactorEnabled: boolean;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Create a session and set the cookie. Call only from Server Actions or Route Handlers. */
export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const userAgent = (await headers()).get("user-agent")?.slice(0, 255) ?? null;

  await db.authSession.create({
    data: { tokenHash: hashToken(token), userId, expiresAt, userAgent },
  });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** Delete the current session row and cookie. */
export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.authSession.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  store.delete(SESSION_COOKIE);
}

/** Sign a user out everywhere, e.g. when an admin suspends them. */
export async function destroyAllSessions(userId: string): Promise<void> {
  await db.authSession.deleteMany({ where: { userId } });
}

/** Sign out every other device, keeping this session (after security changes). */
export async function destroyOtherSessions(userId: string): Promise<number> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const { count } = await db.authSession.deleteMany({ where: { userId, ...(token && { tokenHash: { not: hashToken(token) } }) } });
  return count;
}

/** Number of signed-in devices other than this one. */
export async function otherSessionCount(userId: string): Promise<number> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return db.authSession.count({ where: { userId, expiresAt: { gt: new Date() }, ...(token && { tokenHash: { not: hashToken(token) } }) } });
}

/**
 * The signed-in user, or null. Memoised per request, so layouts and pages
 * can both call it without extra queries.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  // Session state is per request; never prerender it.
  await connection();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.authSession.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      expiresAt: true,
      user: {
        select: { id: true, email: true, name: true, role: true, locale: true, status: true, deletedAt: true, totpEnabledAt: true },
      },
    },
  });
  if (!session || session.expiresAt < new Date()) return null;

  const { user } = session;
  if (user.status !== "active" || user.deletedAt) return null;
  return { id: user.id, email: user.email, name: user.name, role: user.role, locale: user.locale, twoFactorEnabled: !!user.totpEnabledAt };
});

/** Require a signed-in user; otherwise send them to sign-in and back here after. */
export async function requireUser(locale: Locale, returnTo: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/${locale}/sign-in?next=${encodeURIComponent(returnTo)}`);
  }
  return user;
}

/** Require a specific role. Other signed-in roles go to their own home. */
export async function requireRole(locale: Locale, role: Role, returnTo: string): Promise<CurrentUser> {
  const user = await requireUser(locale, returnTo);
  if (user.role !== role) redirect(`/${locale}${homePathFor(user.role)}`);
  // Psychologists and admins can't use their area until 2FA is set up.
  if (twoFactorRequired(user.role) && !user.twoFactorEnabled) redirect(`/${locale}/security?required=1`);
  return user;
}

/** For Server Actions: throw instead of redirecting if the permission is missing. */
export async function assertPermission(permission: Permission): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || !can(user.role, permission) || (twoFactorRequired(user.role) && !user.twoFactorEnabled)) {
    throw new Error("Forbidden");
  }
  return user;
}
