import { connection } from "next/server";
import { db } from "@/lib/db";

/**
 * Uptime check for monitoring services: 200 when the app can reach the
 * database, 503 otherwise. Reveals nothing else.
 */
export async function GET() {
  await connection();
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[health] database check failed", e);
    return Response.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
