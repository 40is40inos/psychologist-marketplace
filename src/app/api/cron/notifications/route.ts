import { timingSafeEqual } from "node:crypto";
import { processDueNotifications } from "@/lib/notifications/send";

/**
 * Sends due emails/SMS. Call every 5 minutes from a scheduler (Vercel Cron,
 * GitHub Actions, a system cron with curl) with:
 *   Authorization: Bearer $CRON_SECRET
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  const ok = !!secret && given.length === secret.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret));
  if (!ok) return new Response("Unauthorized", { status: 401 });

  const result = await processDueNotifications();
  return Response.json(result);
}

export const GET = POST;
