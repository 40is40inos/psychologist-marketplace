"use server";

import { randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { PENDING_COOKIE, signPending } from "@/lib/auth/two-factor";
import { LEGAL_VERSION } from "@/config/legal";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { DEFAULT_MARKET } from "@/config/market";
import { homePathFor, SIGNUP_ROLES } from "@/domain/roles";
import { PROFESSIONAL_TITLES } from "@/domain/professional-titles";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import { getDummyHash, hashPassword, verifyPassword } from "@/lib/auth/password";
import { rateLimit } from "@/lib/auth/rate-limit";
import { createSession, destroySession } from "@/lib/auth/session";
import { safeNextPath } from "@/lib/safe-redirect";
import { slugify } from "@/lib/slug";

/** Error codes map to dictionary strings under auth.errors. */
export type AuthErrorCode =
  | "invalid_credentials"
  | "rate_limited"
  | "email_taken"
  | "suspended"
  | "invalid_input";

export interface AuthFormState {
  error?: AuthErrorCode;
  /** Field name -> true when that field failed validation. */
  fieldErrors?: Record<string, true>;
  /** Submitted values (never the password) to refill the form. */
  values?: Record<string, string>;
}

function localeFrom(formData: FormData): Locale {
  const value = formData.get("locale");
  return typeof value === "string" && isLocale(value) ? value : defaultLocale;
}

function formValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData) {
    if (typeof value === "string" && key !== "password" && !key.startsWith("$")) {
      values[key] = value;
    }
  }
  return values;
}

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email().max(254));

// ─── Sign in ────────────────────────────────────────────────────────────────

const signInSchema = z.object({
  email,
  password: z.string().min(1).max(200),
});

export async function signIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const locale = localeFrom(formData);
  const values = formValues(formData);
  const parsed = signInSchema.safeParse({ email: values.email, password: formData.get("password") });
  if (!parsed.success) return { error: "invalid_credentials", values };

  const { email: address, password } = parsed.data;
  if (!rateLimit(`signin:${await clientIp()}:${address}`, 8, 15 * 60_000)) {
    return { error: "rate_limited", values };
  }

  const user = await db.user.findUnique({
    where: { email: address },
    select: { id: true, passwordHash: true, role: true, status: true, deletedAt: true, totpEnabledAt: true },
  });
  // Always run one hash comparison so response time doesn't reveal unknown emails.
  const ok = await verifyPassword(password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !ok || user.deletedAt) return { error: "invalid_credentials", values };
  if (user.status !== "active") return { error: "suspended", values };

  const next = safeNextPath(formData.get("next"), locale);

  // Second step: password was right, now ask for the authenticator code.
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

// ─── Sign up ────────────────────────────────────────────────────────────────

const signUpSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email,
  password: z.string().min(10).max(200),
  consent: z.literal("on"),
  role: z.enum(SIGNUP_ROLES),
});

const psychologistSchema = z.object({
  title: z.enum(PROFESSIONAL_TITLES),
  licenseNumber: z.string().trim().min(3).max(50),
  licensingAuthority: z.string().trim().min(2).max(150),
});

export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const locale = localeFrom(formData);
  const values = formValues(formData);
  const raw = { ...values, password: formData.get("password") };

  const base = signUpSchema.safeParse(raw);
  const pro = values.role === "psychologist" ? psychologistSchema.safeParse(raw) : null;
  const healthOk = values.role !== "client" || formData.get("healthConsent") === "on";
  if (!base.success || (pro && !pro.success) || !healthOk) {
    const fieldErrors: Record<string, true> = {};
    for (const issue of [...(base.error?.issues ?? []), ...(pro?.error?.issues ?? [])]) {
      fieldErrors[String(issue.path[0])] = true;
    }
    if (!healthOk) fieldErrors.consent = true;
    return { error: "invalid_input", fieldErrors, values };
  }

  if (!rateLimit(`signup:${await clientIp()}`, 5, 60 * 60_000)) {
    return { error: "rate_limited", values };
  }

  const { name, email: address, password, role } = base.data;
  if (await db.user.findUnique({ where: { email: address }, select: { id: true } })) {
    return { error: "email_taken", fieldErrors: { email: true }, values };
  }

  const user = await db.user.create({
    data: {
      name,
      email: address,
      passwordHash: await hashPassword(password),
      role,
      locale,
      ...(pro?.success && {
        psychologistProfile: {
          create: {
            slug: `${slugify(name) || "psychologist"}-${randomBytes(3).toString("hex")}`,
            countryCode: DEFAULT_MARKET,
            title: pro.data.title,
            licenseNumber: pro.data.licenseNumber,
            licensingAuthority: pro.data.licensingAuthority,
            sessionLanguages: [locale],
          },
        },
      }),
    },
    select: { id: true, role: true },
  });

  // Proof of consent (GDPR Art. 7): what was accepted, which version, when.
  const userAgent = (await headers()).get("user-agent")?.slice(0, 255) ?? null;
  const kinds = role === "client" ? (["terms", "privacy", "health_data"] as const) : (["psychologist_terms", "privacy"] as const);
  await db.consentRecord.createMany({ data: kinds.map((kind) => ({ userId: user.id, kind, version: LEGAL_VERSION, userAgent })) });

  await createSession(user.id);
  // Clients who signed up mid-booking go back to their booking.
  const next = user.role === "client" ? safeNextPath(formData.get("next"), locale) : null;
  redirect(next ?? `/${locale}${homePathFor(user.role)}`);
}

// ─── Sign out ───────────────────────────────────────────────────────────────

export async function signOut(formData: FormData): Promise<void> {
  await destroySession();
  redirect(`/${localeFrom(formData)}`);
}
