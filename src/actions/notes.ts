"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { assertPermission } from "@/lib/auth/session";

export interface NoteState {
  ok?: boolean;
  error?: string;
  at?: number;
}

async function me() {
  const user = await assertPermission("clients.readOwn");
  const p = await db.psychologistProfile.findUniqueOrThrow({ where: { userId: user.id }, select: { id: true } });
  return p.id;
}

const noteSchema = z.object({
  clientId: z.string().min(1),
  appointmentId: z.string().optional(),
  body: z.string().trim().min(1).max(20_000),
});

/** Notes can only be written about people this psychologist has seen. */
export async function addNote(_p: NoteState, fd: FormData): Promise<NoteState> {
  const psychologistId = await me();
  const parsed = noteSchema.safeParse({ ...Object.fromEntries(fd), appointmentId: fd.get("appointmentId") || undefined });
  if (!parsed.success) return { error: "invalid", at: Date.now() };
  const { clientId, appointmentId, body } = parsed.data;

  const relation = await db.appointment.findFirst({
    where: { psychologistId, clientId, ...(appointmentId && { id: appointmentId }) },
    select: { id: true },
  });
  if (!relation) return { error: "invalid", at: Date.now() };

  await db.sessionNote.create({ data: { psychologistId, clientId, appointmentId: appointmentId ?? null, bodyEncrypted: encrypt(body) } });
  refresh();
  return { ok: true, at: Date.now() };
}

export async function deleteNote(fd: FormData): Promise<void> {
  const psychologistId = await me();
  await db.sessionNote.deleteMany({ where: { id: String(fd.get("noteId")), psychologistId } });
  refresh();
}
