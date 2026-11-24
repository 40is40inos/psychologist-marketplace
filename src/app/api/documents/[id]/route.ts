import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { readStored, signedDownloadUrl } from "@/lib/storage";
import { logAccess } from "@/lib/audit";

/** Verification documents: only the psychologist who uploaded them and admins. */
export async function GET(_req: Request, ctx: RouteContext<"/api/documents/[id]">) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const doc = await db.document.findUnique({
    where: { id },
    select: { storageKey: true, mimeType: true, filename: true, psychologist: { select: { userId: true } } },
  });
  if (!doc || (doc.psychologist.userId !== user.id && user.role !== "admin")) return new Response("Not found", { status: 404 });

  logAccess(user.id, "document.view", "Document", id, { role: user.role });
  // Bucket storage: a one-minute link, handed out only after the checks above.
  const signed = await signedDownloadUrl(doc.storageKey, { seconds: 60, mimeType: doc.mimeType, filename: doc.filename });
  if (signed) return new Response(null, { status: 302, headers: { Location: signed, "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
  const body = await readStored(doc.storageKey).catch(() => null);
  if (!body) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": doc.mimeType,
      // Inline for viewing; the name is sanitised to avoid header injection.
      "Content-Disposition": `inline; filename="${doc.filename.replace(/[^\w.\- ]/g, "_")}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
