import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Private file storage for documents and photos. Files are written outside
 * /public and served only through authorised routes. Local disk by default
 * (STORAGE_DIR); swap this module for S3/R2 in production — callers only use
 * put/get/remove with opaque keys.
 */
const ROOT = path.resolve(process.env.STORAGE_DIR ?? "storage");

export const ALLOWED_TYPES: Record<string, { ext: string; maxBytes: number }> = {
  "application/pdf": { ext: "pdf", maxBytes: 10 * 1024 * 1024 },
  "image/jpeg": { ext: "jpg", maxBytes: 8 * 1024 * 1024 },
  "image/png": { ext: "png", maxBytes: 8 * 1024 * 1024 },
  "image/webp": { ext: "webp", maxBytes: 8 * 1024 * 1024 },
};

/** Check the first bytes so a renamed file can't pass as a PDF or image. */
function sniff(buf: Buffer): string | null {
  if (buf.subarray(0, 4).toString() === "%PDF") return "application/pdf";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP") return "image/webp";
  return null;
}

export type StoreError = "empty" | "type" | "size";

export async function storeUpload(
  file: File,
  folder: string,
  accept: string[],
): Promise<{ key: string; mimeType: string; size: number } | { error: StoreError }> {
  if (!file || file.size === 0) return { error: "empty" };
  const buf = Buffer.from(await file.arrayBuffer());
  const mime = sniff(buf);
  if (!mime || !accept.includes(mime)) return { error: "type" };
  if (buf.length > ALLOWED_TYPES[mime].maxBytes) return { error: "size" };

  const key = `${folder}/${randomBytes(16).toString("hex")}.${ALLOWED_TYPES[mime].ext}`;
  const full = path.join(ROOT, key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, buf, { mode: 0o600 });
  return { key, mimeType: mime, size: buf.length };
}

function safePath(key: string): string {
  const full = path.resolve(ROOT, key);
  if (!full.startsWith(ROOT + path.sep)) throw new Error("Invalid storage key");
  return full;
}

export async function readStored(key: string): Promise<Buffer> {
  return readFile(safePath(key));
}

export async function removeStored(key: string): Promise<void> {
  await unlink(safePath(key)).catch(() => {});
}
