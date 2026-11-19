import "server-only";
import type { ConsentKind } from "@/generated/prisma/client";
import { db } from "@/lib/db";

/** Is the latest consent of this kind still in force? */
export async function hasConsent(userId: string, kind: ConsentKind): Promise<boolean> {
  const latest = await db.consentRecord.findFirst({ where: { userId, kind }, orderBy: { grantedAt: "desc" }, select: { withdrawnAt: true } });
  return !!latest && !latest.withdrawnAt;
}
