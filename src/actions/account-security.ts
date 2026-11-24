"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import { db } from "@/lib/db";
import { getCurrentUser, destroyAllSessions, destroyOtherSessions } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { rateLimit } from "@/lib/auth/rate-limit";
import { spendToken } from "@/lib/auth/tokens";
import { isDemoAccount } from "@/config/demo";
import { sendEmailChangeEmails, sendPasswordResetEmail, sendSecurityNotice, sendVerificationEmail } from "@/lib/auth/account-emails";

/**
 * Account basics: forgotten password, changing password or email, email
 * verification and signing out other devices. Every security change signs
 * out other devices and sends a "was this you?" email.
 */
export interface SecurityState {
  ok?: boolean;
  error?: "invalid" | "rate_limited" | "expired" | "mismatch" | "weak" | "wrong_password" | "same_email" | "demo";
  at?: number;
}

const fail = (error: SecurityState["error"]): SecurityState => ({ error, at: Date.now() });
const done = (): SecurityState => ({ ok: true, at: Date.now() });

const emailSchema = z.string().trim().toLowerCase().pipe(z.email().max(254));
/** Same rule as sign-up. */
const newPasswordSchema = z.string().min(10).max(200);
const NO_PASSWORD = "!";

function localeOf(fd: FormData): Locale {
  const l = fd.get("locale");
  return typeof l === "string" && isLocale(l) ? l : defaultLocale;
}

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

function audit(actorId: string, action: string) {
  return db.auditLog.create({ data: { actorId, action, targetType: "User", targetId: actorId } });
}

/** New password + confirmation, checked the same way everywhere. */
function readNewPassword(fd: FormData): { password: string } | { error: "weak" | "mismatch" } {
  const password = String(fd.get("newPassword") ?? "");
  if (!newPasswordSchema.safeParse(password).success) return { error: "weak" };
  if (password !== String(fd.get("confirmPassword") ?? "")) return { error: "mismatch" };
  return { password };
}

// ─── Forgotten password ─────────────────────────────────────────────────────

/** Same answer whether or not the address has an account. */
export async function requestPasswordReset(_p: SecurityState, fd: FormData): Promise<SecurityState> {
  const parsed = emailSchema.safeParse(fd.get("email"));
  if (!parsed.success) return fail("invalid");
  if (!(await rateLimit(`reset:${await clientIp()}`, 5, 15 * 60_000)) || !(await rateLimit(`reset:${parsed.data}`, 3, 60 * 60_000))) return fail("rate_limited");

  const user = await db.user.findUnique({ where: { email: parsed.data }, select: { id: true, email: true, locale: true, status: true, deletedAt: true } });
  if (user && user.status === "active" && !user.deletedAt && !isDemoAccount(user.email)) await sendPasswordResetEmail(user);
  return done();
}

/** From the emailed link: set a new password and sign out everywhere. */
export async function resetPassword(_p: SecurityState, fd: FormData): Promise<SecurityState> {
  const locale = localeOf(fd);
  const next = readNewPassword(fd);
  if ("error" in next) return fail(next.error);
  if (!(await rateLimit(`reset-use:${await clientIp()}`, 10, 15 * 60_000))) return fail("rate_limited");

  const record = await spendToken(String(fd.get("token") ?? ""), ["password_reset"]);
  if (!record) return fail("expired");
  const user = await db.user.findUnique({ where: { id: record.userId }, select: { id: true, email: true, locale: true, status: true, deletedAt: true } });
  if (!user || user.status !== "active" || user.deletedAt) return fail("expired");

  await db.user.update({
    where: { id: user.id },
    // The link reached this inbox, so the address is proven too.
    data: { passwordHash: await hashPassword(next.password), emailVerifiedAt: new Date() },
  });
  await destroyAllSessions(user.id);
  await audit(user.id, "security.password_reset");
  await sendSecurityNotice(user.email, user.locale, "passwordChanged");
  // No automatic sign-in: the person signs in again (with 2FA if enabled).
  redirect(`/${locale}/sign-in?reset=1`);
}

// ─── Signed in: password ────────────────────────────────────────────────────

export async function changePassword(_p: SecurityState, fd: FormData): Promise<SecurityState> {
  const me = await getCurrentUser();
  if (!me) redirect(`/${localeOf(fd)}/sign-in`);
  if (isDemoAccount(me.email)) return fail("demo");
  if (!(await rateLimit(`pw-change:${me.id}`, 5, 15 * 60_000))) return fail("rate_limited");
  const user = await db.user.findUniqueOrThrow({ where: { id: me.id }, select: { passwordHash: true, email: true, locale: true } });

  // Accounts without a password (Google or email links only) can set one.
  if (user.passwordHash !== NO_PASSWORD && !(await verifyPassword(String(fd.get("currentPassword") ?? ""), user.passwordHash))) return fail("wrong_password");
  const next = readNewPassword(fd);
  if ("error" in next) return fail(next.error);

  await db.user.update({ where: { id: me.id }, data: { passwordHash: await hashPassword(next.password) } });
  await destroyOtherSessions(me.id);
  await audit(me.id, "security.password_change");
  await sendSecurityNotice(user.email, user.locale, "passwordChanged");
  refresh();
  return done();
}

// ─── Signed in: email address ───────────────────────────────────────────────

/**
 * Sends a confirmation link to the new address. Nothing changes until it is
 * clicked. The answer is the same if the address is already taken, so the
 * form can't be used to find out who has an account.
 */
export async function requestEmailChange(_p: SecurityState, fd: FormData): Promise<SecurityState> {
  const me = await getCurrentUser();
  if (!me) redirect(`/${localeOf(fd)}/sign-in`);
  if (isDemoAccount(me.email)) return fail("demo");
  const parsed = emailSchema.safeParse(fd.get("newEmail"));
  if (!parsed.success) return fail("invalid");
  if (!(await rateLimit(`email-change:${me.id}`, 3, 60 * 60_000))) return fail("rate_limited");

  const user = await db.user.findUniqueOrThrow({ where: { id: me.id }, select: { id: true, email: true, locale: true, passwordHash: true } });
  if (parsed.data === user.email) return fail("same_email");
  if (user.passwordHash !== NO_PASSWORD && !(await verifyPassword(String(fd.get("currentPassword") ?? ""), user.passwordHash))) return fail("wrong_password");

  const taken = await db.user.findUnique({ where: { email: parsed.data }, select: { id: true } });
  if (!taken) await sendEmailChangeEmails(user, parsed.data);
  await audit(me.id, "security.email_change_requested");
  return done();
}

/**
 * From the confirmation page (a button, so email scanners can't spend the
 * link): verifies the address, or switches to the new one.
 */
export async function confirmEmailLink(_p: SecurityState, fd: FormData): Promise<SecurityState> {
  if (!(await rateLimit(`email-confirm:${await clientIp()}`, 10, 15 * 60_000))) return fail("rate_limited");
  const record = await spendToken(String(fd.get("token") ?? ""), ["email_verify", "email_change"]);
  if (!record) return fail("expired");
  const user = await db.user.findUnique({ where: { id: record.userId }, select: { id: true, email: true, locale: true, status: true, deletedAt: true } });
  if (!user || user.status !== "active" || user.deletedAt) return fail("expired");

  if (record.purpose === "email_verify") {
    // The link is for the address it was sent to; ignore it after a change.
    await db.user.updateMany({ where: { id: user.id, emailVerifiedAt: null }, data: { emailVerifiedAt: new Date() } });
    refresh();
    return done();
  }

  const newEmail = record.newEmail!;
  if (await db.user.findUnique({ where: { email: newEmail }, select: { id: true } })) return fail("expired");
  await db.user.update({ where: { id: user.id }, data: { email: newEmail, emailVerifiedAt: new Date() } });
  await destroyOtherSessions(user.id);
  await audit(user.id, "security.email_change");
  await sendSecurityNotice(user.email, user.locale, "emailChanged");
  refresh();
  return done();
}

export async function resendVerification(_p: SecurityState, fd: FormData): Promise<SecurityState> {
  const me = await getCurrentUser();
  if (!me) redirect(`/${localeOf(fd)}/sign-in`);
  if (!(await rateLimit(`verify-resend:${me.id}`, 3, 60 * 60_000))) return fail("rate_limited");
  const user = await db.user.findUniqueOrThrow({ where: { id: me.id }, select: { id: true, email: true, locale: true, emailVerifiedAt: true } });
  if (!user.emailVerifiedAt) await sendVerificationEmail(user);
  return done();
}

// ─── Devices ────────────────────────────────────────────────────────────────

export async function signOutOtherDevices(fd: FormData): Promise<void> {
  const me = await getCurrentUser();
  if (!me) redirect(`/${localeOf(fd)}/sign-in`);
  // Demo accounts are shared by many visitors: don't sign the others out.
  if (isDemoAccount(me.email)) return;
  await destroyOtherSessions(me.id);
  await audit(me.id, "security.sign_out_others");
  refresh();
}
