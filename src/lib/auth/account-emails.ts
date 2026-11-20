import "server-only";
import { brand } from "@/config/brand";
import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { fill } from "@/lib/format";
import { sendEmail } from "@/lib/notifications/providers";
import { issueToken, TOKEN_TTL_MS } from "@/lib/auth/tokens";

/**
 * Emails about the account itself. Neutral wording like every other email:
 * nothing that says what kind of service this is beyond the brand name.
 */
function link(locale: Locale, path: string, token: string): string {
  const url = new URL(`/${locale}${path}`, brand.siteUrl);
  url.searchParams.set("token", token);
  return url.toString();
}

const hours = (ms: number) => Math.round(ms / 3_600_000);

export async function sendVerificationEmail(user: { id: string; email: string; locale: Locale }): Promise<void> {
  const token = await issueToken(user.id, "email_verify");
  const t = (await getDictionary(user.locale)).accountSecurity.emails;
  await sendEmail({
    to: user.email,
    subject: fill(t.verifySubject, { brand: brand.name }),
    text: fill(t.verifyBody, { url: link(user.locale, "/confirm-email", token), hours: hours(TOKEN_TTL_MS.email_verify) }),
  });
}

export async function sendPasswordResetEmail(user: { id: string; email: string; locale: Locale }): Promise<void> {
  const token = await issueToken(user.id, "password_reset");
  const t = (await getDictionary(user.locale)).accountSecurity.emails;
  await sendEmail({
    to: user.email,
    subject: fill(t.resetSubject, { brand: brand.name }),
    text: fill(t.resetBody, { url: link(user.locale, "/reset-password", token), minutes: TOKEN_TTL_MS.password_reset / 60_000 }),
  });
}

/** Link to the NEW address; a heads-up to the old one. */
export async function sendEmailChangeEmails(user: { id: string; email: string; locale: Locale }, newEmail: string): Promise<void> {
  const token = await issueToken(user.id, "email_change", newEmail);
  const t = (await getDictionary(user.locale)).accountSecurity.emails;
  await sendEmail({
    to: newEmail,
    subject: fill(t.changeSubject, { brand: brand.name }),
    text: fill(t.changeBody, { url: link(user.locale, "/confirm-email", token), hours: hours(TOKEN_TTL_MS.email_change) }),
  });
  await sendEmail({ to: user.email, subject: fill(t.changeRequestedSubject, { brand: brand.name }), text: fill(t.changeRequestedBody, { email: maskEmail(newEmail) }) });
}

export type SecurityNotice = "passwordChanged" | "emailChanged";

/** "Was this you?" after a security change, sent to the (old) address. */
export async function sendSecurityNotice(to: string, locale: Locale, kind: SecurityNotice): Promise<void> {
  const t = (await getDictionary(locale)).accountSecurity.emails;
  const url = new URL(`/${locale}/sign-in/forgot`, brand.siteUrl).toString();
  await sendEmail({ to, subject: fill(t[`${kind}Subject`], { brand: brand.name }), text: fill(t[`${kind}Body`], { url }) });
}

/** a***@example.com: enough to recognise, not enough to harvest. */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  return `${local.slice(0, 1)}***@${domain}`;
}
