import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

/**
 * Access audit for sensitive records (clinical notes, intake answers,
 * verification documents, data exports). Writes to the append-only audit
 * log; fire-and-forget so a logging failure never blocks care.
 */
export type AccessAction =
  | "client_record.view"
  | "intake.view"
  | "document.view"
  | "data.export"
  | "account.delete";

export function logAccess(actorId: string, action: AccessAction, targetType: string, targetId: string, metadata?: Prisma.InputJsonValue): void {
  db.auditLog
    .create({ data: { actorId, action, targetType, targetId, metadata } })
    .catch((e) => console.warn("[audit]", String(e).slice(0, 200)));
}
