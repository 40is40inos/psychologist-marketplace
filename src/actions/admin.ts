"use server";

import { isDemoAccount } from "@/config/demo";
import { refresh } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { assertPermission, destroyAllSessions } from "@/lib/auth/session";

export interface AdminActionState {
  error?: "reason_required" | "not_found" | "invalid";
  ok?: boolean;
}

function audit(
  tx: Prisma.TransactionClient,
  actorId: string,
  action: string,
  targetType: string,
  targetId: string,
  metadata?: Prisma.InputJsonValue,
) {
  return tx.auditLog.create({ data: { actorId, action, targetType, targetId, metadata } });
}

// ─── License verification ───────────────────────────────────────────────────

const verifySchema = z.object({
  profileId: z.string().min(1),
  decision: z.enum(["approve", "reject"]),
  reason: z.string().trim().max(500).optional(),
});

export async function decideVerification(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await assertPermission("licenses.verify");
  const parsed = verifySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "invalid" };
  const { profileId, decision, reason } = parsed.data;
  if (decision === "reject" && !reason) return { error: "reason_required" };

  const done = await db.$transaction(async (tx) => {
    const profile = await tx.psychologistProfile.findUnique({
      where: { id: profileId },
      select: { verificationStatus: true, licenseNumber: true, licensingAuthority: true, countryCode: true, user: { select: { name: true } } },
    });
    if (!profile || profile.verificationStatus !== "pending") return false;

    // History: the licence exactly as it was checked, and the decision.
    await tx.licenseVerification.create({
      data: {
        psychologistId: profileId,
        licenseNumber: profile.licenseNumber,
        licensingAuthority: profile.licensingAuthority,
        countryCode: profile.countryCode,
        decision: decision === "approve" ? "verified" : "rejected",
        note: reason || null,
        reviewerId: admin.id,
      },
    });

    await tx.psychologistProfile.update({
      where: { id: profileId },
      data:
        decision === "approve"
          ? { verificationStatus: "verified", verifiedAt: new Date(), verifiedById: admin.id, rejectionReason: null }
          : { verificationStatus: "rejected", verifiedById: admin.id, rejectionReason: reason },
    });
    await audit(tx, admin.id, decision === "approve" ? "license.verify" : "license.reject", "PsychologistProfile", profileId, {
      name: profile.user.name,
      ...(reason ? { reason } : {}),
    });
    return true;
  });

  if (!done) return { error: "not_found" };
  refresh();
  return { ok: true };
}

// ─── Users ──────────────────────────────────────────────────────────────────

const userStatusSchema = z.object({
  userId: z.string().min(1),
  status: z.enum(["active", "suspended"]),
});

export async function setUserStatus(formData: FormData): Promise<void> {
  const admin = await assertPermission("users.manage");
  const parsed = userStatusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const { userId, status } = parsed.data;
  if (userId === admin.id) return; // Admins can't lock themselves out.
  // Demo: the shared demo accounts can't be suspended.
  const target = await db.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!target || (status === "suspended" && isDemoAccount(target.email))) return;

  await db.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: userId },
      data: { status },
      select: { name: true, psychologistProfile: { select: { id: true, verificationStatus: true } } },
    });
    // A suspended psychologist disappears from search; reactivating
    // restores a previously verified profile.
    const profile = user.psychologistProfile;
    if (profile && status === "suspended" && profile.verificationStatus === "verified") {
      await tx.psychologistProfile.update({ where: { id: profile.id }, data: { verificationStatus: "suspended" } });
    }
    if (profile && status === "active" && profile.verificationStatus === "suspended") {
      await tx.psychologistProfile.update({ where: { id: profile.id }, data: { verificationStatus: "verified" } });
    }
    await audit(tx, admin.id, status === "suspended" ? "user.suspend" : "user.reactivate", "User", userId, {
      name: user.name,
    });
  });

  if (status === "suspended") await destroyAllSessions(userId);
  refresh();
}

// ─── Disputes ───────────────────────────────────────────────────────────────

const disputeSchema = z.object({
  disputeId: z.string().min(1),
  decision: z.enum(["review", "resolve", "reject"]),
  resolution: z.string().trim().max(2000).optional(),
});

export async function decideDispute(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await assertPermission("disputes.resolve");
  const parsed = disputeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "invalid" };
  const { disputeId, decision, resolution } = parsed.data;
  if (decision !== "review" && !resolution) return { error: "reason_required" };

  const done = await db.$transaction(async (tx) => {
    const dispute = await tx.dispute.findUnique({ where: { id: disputeId }, select: { status: true } });
    if (!dispute || dispute.status === "resolved" || dispute.status === "rejected") return false;

    await tx.dispute.update({
      where: { id: disputeId },
      data:
        decision === "review"
          ? { status: "under_review" }
          : {
              status: decision === "resolve" ? "resolved" : "rejected",
              resolution,
              resolvedById: admin.id,
              resolvedAt: new Date(),
            },
    });
    await audit(tx, admin.id, `dispute.${decision}`, "Dispute", disputeId);
    return true;
  });

  if (!done) return { error: "not_found" };
  refresh();
  return { ok: true };
}
