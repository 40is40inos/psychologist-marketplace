"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { createSession, destroyOtherSessions, getCurrentUser } from "@/lib/auth/session";
import { isDemoAccount } from "@/config/demo";
import { rateLimit } from "@/lib/auth/rate-limit";
import { generateRecoveryCodes, hashRecoveryCode, verifyTotp } from "@/lib/auth/totp";
import { PENDING_COOKIE, readPending, twoFactorRequired } from "@/lib/auth/two-factor";
import { homePathFor } from "@/domain/roles";
import { defaultLocale, isLocale } from "@/i18n/config";
import { safeNextPath } from "@/lib/safe-redirect";

export interface TwoFactorState {
  error?: "invalid" | "expired" | "tooMany";
  ok?: boolean;
  /** Shown once, right after enabling or regenerating. */
  recoveryCodes?: string[];
  at?: number;
}
const fail = (error: TwoFactorState["error"]): TwoFactorState => ({ error, at: Date.now() });

function localeOf(fd: FormData) {
  const l = fd.get("locale");
  return typeof l === "string" && isLocale(l) ? l : defaultLocale;
}

/** Second sign-in step: authenticator code or a one-time recovery code. */
export async function verifySignIn(_p: TwoFactorState, fd: FormData): Promise<TwoFactorState> {
  const locale = localeOf(fd);
  const store = await cookies();
  const userId = readPending(store.get(PENDING_COOKIE)?.value);
  if (!userId) return fail("expired");
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!(await rateLimit(`2fa:${userId}:${ip}`, 6, 10 * 60_000))) return fail("tooMany");

  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, role: true, status: true, totpSecretEncrypted: true, totpEnabledAt: true, recoveryCodeHashes: true } });
  if (!user || user.status !== "active" || !user.totpEnabledAt || !user.totpSecretEncrypted) return fail("expired");

  const code = String(fd.get("code") ?? "").trim();
  const recovery = String(fd.get("recovery") ?? "").trim();
  let ok = false;
  if (code) ok = verifyTotp(decrypt(user.totpSecretEncrypted), code);
  else if (recovery) {
    const h = hashRecoveryCode(recovery);
    if (user.recoveryCodeHashes.includes(h)) {
      // Recovery codes work once.
      await db.user.update({ where: { id: user.id }, data: { recoveryCodeHashes: user.recoveryCodeHashes.filter((x) => x !== h) } });
      ok = true;
    }
  }
  if (!ok) return fail("invalid");

  store.delete(PENDING_COOKIE);
  await createSession(user.id);
  await db.user.update({ where: { id: user.id }, data: { lastSignInAt: new Date() } });
  redirect(safeNextPath(fd.get("next"), locale) ?? `/${locale}${homePathFor(user.role)}`);
}

/** Confirm the first code from the authenticator app and turn 2FA on. */
export async function enableTwoFactor(_p: TwoFactorState, fd: FormData): Promise<TwoFactorState> {
  const me = await getCurrentUser();
  if (!me) redirect(`/${localeOf(fd)}/sign-in`);
  if (isDemoAccount(me.email)) return fail("invalid");
  if (!(await rateLimit(`2fa-setup:${me.id}`, 10, 10 * 60_000))) return fail("tooMany");
  const user = await db.user.findUniqueOrThrow({ where: { id: me.id }, select: { totpSecretEncrypted: true, totpEnabledAt: true } });
  if (user.totpEnabledAt || !user.totpSecretEncrypted) return fail("expired");
  if (!verifyTotp(decrypt(user.totpSecretEncrypted), String(fd.get("code") ?? ""))) return fail("invalid");

  const { codes, hashes } = generateRecoveryCodes();
  await db.user.update({ where: { id: me.id }, data: { totpEnabledAt: new Date(), recoveryCodeHashes: hashes } });
  await db.auditLog.create({ data: { actorId: me.id, action: "security.2fa_enable", targetType: "User", targetId: me.id } });
  return { ok: true, recoveryCodes: codes, at: Date.now() };
}

export async function regenerateRecoveryCodes(_p: TwoFactorState, fd: FormData): Promise<TwoFactorState> {
  const me = await getCurrentUser();
  if (!me) redirect(`/${localeOf(fd)}/sign-in`);
  if (!me.twoFactorEnabled) return fail("expired");
  const { codes, hashes } = generateRecoveryCodes();
  await db.user.update({ where: { id: me.id }, data: { recoveryCodeHashes: hashes } });
  return { ok: true, recoveryCodes: codes, at: Date.now() };
}

/** Clients may turn 2FA off; psychologists and admins may not. */
export async function disableTwoFactor(fd: FormData): Promise<void> {
  const me = await getCurrentUser();
  if (!me) redirect(`/${localeOf(fd)}/sign-in`);
  if (twoFactorRequired(me.role)) return;
  await db.user.update({ where: { id: me.id }, data: { totpEnabledAt: null, totpSecretEncrypted: null, recoveryCodeHashes: [] } });
  await destroyOtherSessions(me.id);
  await db.auditLog.create({ data: { actorId: me.id, action: "security.2fa_disable", targetType: "User", targetId: me.id } });
  refresh();
}
