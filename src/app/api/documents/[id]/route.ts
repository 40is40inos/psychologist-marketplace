import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { readStored } from "@/lib/storage";
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
  const body = await readStored(doc.storageKey);
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
