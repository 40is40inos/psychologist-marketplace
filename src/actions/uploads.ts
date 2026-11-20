"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/auth/session";
import { rateLimit } from "@/lib/auth/rate-limit";
import { signValue } from "@/lib/auth/signed-value";
import { checkDeclared, directUploads, newKey, presignUpload, type StoreError } from "@/lib/storage";
import { UPLOAD_KINDS, type UploadTicket } from "@/domain/uploads";

/**
 * Step one of a direct upload: checks the declared type and size, then
 * returns a signed PUT URL for the bucket and a signed ticket the form sends
 * back. The saving action re-checks the stored object itself.
 */
export async function prepareUpload(input: {
  kind: string;
  mime: string;
  size: number;
  filename: string;
}): Promise<{ url: string; ticket: string } | { error: StoreError | "rate_limited" }> {
  const user = await assertPermission("profile.editOwn");
  const parsed = z
    .object({ kind: z.enum(Object.keys(UPLOAD_KINDS) as [keyof typeof UPLOAD_KINDS]), mime: z.string().max(100), size: z.number().int().nonnegative(), filename: z.string().max(500) })
    .safeParse(input);
  if (!parsed.success || !directUploads) return { error: "type" };
  const { kind, mime, size, filename } = parsed.data;
  const declared = checkDeclared(mime, size, UPLOAD_KINDS[kind].accept);
  if (declared) return { error: declared };
  if (!(await rateLimit(`upload:${user.id}`, 20, 60 * 60_000))) return { error: "rate_limited" };

  const profile = await db.psychologistProfile.findUniqueOrThrow({ where: { userId: user.id }, select: { id: true } });
  const key = newKey(`${UPLOAD_KINDS[kind].folder}/${profile.id}`, mime);
  const ticket: UploadTicket = { key, kind, profileId: profile.id, filename: filename.slice(0, 200) };
  return { url: await presignUpload(key, mime), ticket: signValue("upload", ticket, 30 * 60_000) };
}
