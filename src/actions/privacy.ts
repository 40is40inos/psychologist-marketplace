"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser, destroyAllSessions, destroySession } from "@/lib/auth/session";
import { LEGAL_VERSION } from "@/config/legal";
import { defaultLocale, isLocale } from "@/i18n/config";

function localeOf(fd: FormData) {
  const l = fd.get("locale");
  return typeof l === "string" && isLocale(l) ? l : defaultLocale;
}

/** Give or withdraw a revocable consent (health data, optional cookies). */
export async function setConsent(fd: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect(`/${localeOf(fd)}/sign-in`);
  const kind = z.enum(["health_data", "optional_cookies"]).parse(fd.get("kind"));
  const grant = fd.get("grant") === "1";
  if (grant) {
    const userAgent = (await headers()).get("user-agent")?.slice(0, 255) ?? null;
    await db.consentRecord.create({ data: { userId: user.id, kind, version: LEGAL_VERSION, userAgent } });
  } else {
    await db.consentRecord.updateMany({ where: { userId: user.id, kind, withdrawnAt: null }, data: { withdrawnAt: new Date() } });
  }
  refresh();
}

export interface DeleteState {
  error?: "confirm" | "upcoming";
  at?: number;
}

/**
 * Right to erasure (GDPR Art. 17) for clients. Personal data is removed;
 * records the law requires us to keep (payments, receipts, appointments for
 * tax purposes) stay, without identifying details. Psychologists' clinical
 * notes remain under the psychologist's own legal retention duties.
 */
export async function deleteAccount(_p: DeleteState, fd: FormData): Promise<DeleteState> {
  const locale = localeOf(fd);
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/sign-in`);
  if (user.role !== "client") return { error: "confirm", at: Date.now() };
  const word = String(fd.get("confirm") ?? "").trim().toUpperCase();
  if (word !== "DELETE" && word !== "ΔΙΑΓΡΑΦΗ") return { error: "confirm", at: Date.now() };

  const upcoming = await db.appointment.count({ where: { clientId: user.id, status: { in: ["awaiting_payment", "pending", "confirmed"] }, startsAt: { gt: new Date() } } });
  if (upcoming > 0) return { error: "upcoming", at: Date.now() };

  await db.$transaction(async (tx) => {
    await tx.auditLog.create({ data: { actorId: user.id, action: "account.delete", targetType: "User", targetId: user.id } });
    // Content written by the client.
    await tx.message.deleteMany({ where: { senderId: user.id } });
    await tx.appointment.updateMany({ where: { clientId: user.id }, data: { intakeEncrypted: null, intakeRisk: false } });
    await tx.feedback.updateMany({ where: { clientId: user.id }, data: { comment: null } });
    await tx.savedPsychologist.deleteMany({ where: { userId: user.id } });
    await tx.notification.deleteMany({ where: { userId: user.id } });
    await tx.authSession.deleteMany({ where: { userId: user.id } });
    // Identity: scrubbed, login disabled. The row stays so receipts keep their reference.
    await tx.user.update({
      where: { id: user.id },
      data: {
        email: `deleted-${user.id}@deleted.invalid`,
        name: "Deleted user",
        phone: null,
        passwordHash: "!",
        status: "suspended",
        deletedAt: new Date(),
        totpSecretEncrypted: null,
        totpEnabledAt: null,
        recoveryCodeHashes: [],
        emailReminders: false,
        smsReminders: false,
      },
    });
  });
  await destroyAllSessions(user.id);
  await destroySession();
  redirect(`/${locale}`);
}
