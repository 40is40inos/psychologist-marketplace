/**
 * Liveness check without touching the database: for the host's health check
 * and for keep-awake pings on free plans (so the database can still sleep).
 */
export function GET() {
  return new Response("ok", { headers: { "Cache-Control": "no-store", "Content-Type": "text/plain" } });
}
