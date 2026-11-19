"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { assertPermission } from "@/lib/auth/session";
import { transmitInvoice } from "@/lib/invoicing";

export interface PayState {
  ok?: boolean;
  error?: "invalid" | "taxId";
  at?: number;
}

async function me() {
  const user = await assertPermission("profile.editOwn");
  return db.psychologistProfile.findUniqueOrThrow({ where: { userId: user.id }, select: { id: true, taxIdEncrypted: true } });
}

/** Save the psychologist's own myDATA REST API credentials (encrypted). */
export async function saveMydataCredentials(_p: PayState, fd: FormData): Promise<PayState> {
  const p = await me();
  if (!p.taxIdEncrypted) return { error: "taxId", at: Date.now() };
  const parsed = z.object({ user: z.string().trim().min(2).max(100), key: z.string().trim().min(10).max(200) }).safeParse({ user: fd.get("mydataUser"), key: fd.get("mydataKey") });
  if (!parsed.success) return { error: "invalid", at: Date.now() };
  await db.psychologistProfile.update({
    where: { id: p.id },
    data: { mydataUserEncrypted: encrypt(parsed.data.user), mydataKeyEncrypted: encrypt(parsed.data.key) },
  });
  refresh();
  return { ok: true, at: Date.now() };
}

export async function retryInvoice(fd: FormData): Promise<void> {
  const p = await me();
  const inv = await db.invoice.findFirst({ where: { id: String(fd.get("invoiceId")), psychologistId: p.id }, select: { id: true } });
  if (inv) await transmitInvoice(inv.id);
  refresh();
}
