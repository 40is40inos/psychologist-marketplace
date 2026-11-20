import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { readStored, signedDownloadUrl } from "@/lib/storage";

/**
 * Profile photos. Public once the profile is verified and published;
 * before that only the owner and admins can see it.
 */
export async function GET(_req: Request, ctx: RouteContext<"/api/photos/[id]">) {
  const { id } = await ctx.params;
  const doc = await db.document.findFirst({
    where: { id, kind: "photo" },
    select: { storageKey: true, mimeType: true, psychologist: { select: { userId: true, published: true, verificationStatus: true } } },
  });
  if (!doc) return new Response("Not found", { status: 404 });

  const isPublic = doc.psychologist.published && doc.psychologist.verificationStatus === "verified";
  if (!isPublic) {
    const user = await getCurrentUser();
    if (!user || (user.id !== doc.psychologist.userId && user.role !== "admin")) return new Response("Not found", { status: 404 });
  }
  // Bucket storage: redirect to a signed link (valid 1 hour); browsers and
  // the CDN may reuse the redirect for 10 minutes when the photo is public.
  const signed = await signedDownloadUrl(doc.storageKey, { seconds: 3600, mimeType: doc.mimeType });
  if (signed) return new Response(null, { status: 302, headers: { Location: signed, "Cache-Control": isPublic ? "public, max-age=600" : "private, no-store" } });
  const body = await readStored(doc.storageKey);
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": doc.mimeType,
      "Cache-Control": isPublic ? "public, max-age=86400, immutable" : "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
