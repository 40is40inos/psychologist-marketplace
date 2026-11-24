import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { AwsClient } from "aws4fetch";
import { sniffMime } from "@/lib/file-type";

/**
 * Private file storage for documents and photos, addressed by opaque keys.
 *
 * - Production: any S3-compatible bucket (Cloudflare R2 with EU jurisdiction,
 *   AWS S3 eu-central-1, Scaleway...). Set S3_BUCKET and friends. Browsers
 *   upload straight to the bucket with short-lived signed URLs (serverless
 *   hosts cap request bodies at a few MB) and read through signed links that
 *   are only handed out after the app has checked permissions.
 * - Development: local disk under STORAGE_DIR, uploaded through the server.
 */
export const ALLOWED_TYPES: Record<string, { ext: string; maxBytes: number }> = {
  "application/pdf": { ext: "pdf", maxBytes: 10 * 1024 * 1024 },
  "image/jpeg": { ext: "jpg", maxBytes: 8 * 1024 * 1024 },
  "image/png": { ext: "png", maxBytes: 8 * 1024 * 1024 },
  "image/webp": { ext: "webp", maxBytes: 8 * 1024 * 1024 },
};

export type StoreError = "empty" | "type" | "size";

// ─── Backend selection ──────────────────────────────────────────────────────

const s3 = process.env.S3_BUCKET
  ? {
      bucket: process.env.S3_BUCKET,
      endpoint: (process.env.S3_ENDPOINT ?? "").replace(/\/$/, ""),
      client: new AwsClient({
        accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
        region: process.env.S3_REGION || "auto",
        service: "s3",
      }),
    }
  : null;

/** True when browsers upload and download directly from the bucket. */
export const directUploads = s3 !== null;

const ROOT = path.resolve(process.env.STORAGE_DIR ?? "storage");

function localOnly() {
  // Hosted file systems are temporary: refuse instead of losing files. The
  // public demo accepts that (uploads vanish on restart; data is fictional).
  if ((process.env.VERCEL || process.env.RENDER) && process.env.DEMO_MODE !== "true") throw new Error("File storage is not configured: set S3_BUCKET, S3_ENDPOINT, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY");
}

function safePath(key: string): string {
  const full = path.resolve(ROOT, key);
  if (!full.startsWith(ROOT + path.sep)) throw new Error("Invalid storage key");
  return full;
}

function objectUrl(key: string): string {
  if (!/^[a-z]+\/[A-Za-z0-9_-]+\/[a-f0-9]{32}\.[a-z]+$/.test(key)) throw new Error("Invalid storage key");
  return `${s3!.endpoint}/${s3!.bucket}/${key}`;
}

async function s3Fetch(key: string, init: RequestInit = {}): Promise<Response> {
  return s3!.client.fetch(objectUrl(key), init);
}

// ─── Keys ───────────────────────────────────────────────────────────────────

export function newKey(folder: string, mime: string): string {
  return `${folder}/${randomBytes(16).toString("hex")}.${ALLOWED_TYPES[mime].ext}`;
}

/** Checks a declared type and size before anything is stored. */
export function checkDeclared(mime: string, size: number, accept: string[]): StoreError | null {
  if (!size) return "empty";
  if (!accept.includes(mime) || !ALLOWED_TYPES[mime]) return "type";
  if (size > ALLOWED_TYPES[mime].maxBytes) return "size";
  return null;
}

// ─── Server-side upload (development, or small files) ───────────────────────

export async function storeUpload(
  file: File,
  folder: string,
  accept: string[],
): Promise<{ key: string; mimeType: string; size: number } | { error: StoreError }> {
  if (!file || file.size === 0) return { error: "empty" };
  const buf = Buffer.from(await file.arrayBuffer());
  const mime = sniffMime(buf);
  if (!mime || !accept.includes(mime)) return { error: "type" };
  if (buf.length > ALLOWED_TYPES[mime].maxBytes) return { error: "size" };

  const key = newKey(folder, mime);
  if (s3) {
    const res = await s3Fetch(key, { method: "PUT", body: buf, headers: { "Content-Type": mime } });
    if (!res.ok) throw new Error(`Storage upload failed (${res.status})`);
  } else {
    localOnly();
    const full = safePath(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, buf, { mode: 0o600 });
  }
  return { key, mimeType: mime, size: buf.length };
}

// ─── Direct (browser → bucket) uploads ──────────────────────────────────────

/** A signed PUT URL the browser uses once, within 10 minutes. */
export async function presignUpload(key: string, mime: string): Promise<string> {
  if (!s3) throw new Error("Direct uploads need S3 storage");
  const url = new URL(objectUrl(key));
  url.searchParams.set("X-Amz-Expires", "600");
  const signed = await s3.client.sign(url.toString(), { method: "PUT", headers: { "Content-Type": mime }, aws: { signQuery: true, allHeaders: true } });
  return signed.url;
}

/**
 * Checks an object the browser uploaded: real size, and the real type from
 * its first bytes (the declared Content-Type is not trusted). Invalid
 * objects are deleted.
 */
export async function verifyUploaded(key: string, accept: string[]): Promise<{ mimeType: string; size: number } | { error: StoreError }> {
  const head = await s3Fetch(key, { method: "HEAD" });
  if (!head.ok) return { error: "empty" };
  const size = Number(head.headers.get("content-length") ?? 0);
  const start = await s3Fetch(key, { headers: { Range: "bytes=0-15" } });
  const mime = start.ok ? sniffMime(Buffer.from(await start.arrayBuffer())) : null;
  const error: StoreError | null = !size ? "empty" : !mime || !accept.includes(mime) ? "type" : size > ALLOWED_TYPES[mime].maxBytes ? "size" : null;
  if (error) {
    await removeStored(key);
    return { error };
  }
  return { mimeType: mime!, size };
}

// ─── Reading ────────────────────────────────────────────────────────────────

/**
 * A short-lived link to the object, or null with local storage (then the
 * caller streams readStored). Call only after checking permissions.
 */
export async function signedDownloadUrl(key: string, opts: { seconds: number; mimeType: string; filename?: string }): Promise<string | null> {
  if (!s3) return null;
  const url = new URL(objectUrl(key));
  url.searchParams.set("X-Amz-Expires", String(opts.seconds));
  url.searchParams.set("response-content-type", opts.mimeType);
  if (opts.filename) url.searchParams.set("response-content-disposition", `inline; filename="${opts.filename.replace(/[^\w.\- ]/g, "_")}"`);
  const signed = await s3.client.sign(url.toString(), { method: "GET", aws: { signQuery: true } });
  return signed.url;
}

export async function readStored(key: string): Promise<Buffer> {
  if (s3) {
    const res = await s3Fetch(key);
    if (!res.ok) throw new Error(`Storage read failed (${res.status})`);
    return Buffer.from(await res.arrayBuffer());
  }
  return readFile(safePath(key));
}

export async function removeStored(key: string): Promise<void> {
  if (s3) {
    await s3Fetch(key, { method: "DELETE" }).catch(() => {});
    return;
  }
  await unlink(safePath(key)).catch(() => {});
}
