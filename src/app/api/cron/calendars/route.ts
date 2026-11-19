import { timingSafeEqual } from "node:crypto";
import { syncAllCalendars } from "@/lib/calendar-sync";

/**
 * Re-imports busy times from connected Google/Outlook calendars. Call every
 * 15-30 minutes with: Authorization: Bearer $CRON_SECRET
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  const ok = !!secret && given.length === secret.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret));
  if (!ok) return new Response("Unauthorized", { status: 401 });
  return Response.json({ calendars: await syncAllCalendars() });
}

export const GET = POST;
