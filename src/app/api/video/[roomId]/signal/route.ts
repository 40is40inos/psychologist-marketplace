import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { joinWindow } from "@/lib/video";

/**
 * WebRTC signalling for the built-in video room. Only the two participants
 * of the appointment can read or write, and only while the room is open.
 * Media never passes through this server; only connection metadata does.
 */
async function authorise(roomId: string) {
  const user = await getCurrentUser();
  if (!user) return null;
  const room = await db.videoRoom.findUnique({
    where: { id: roomId },
    select: { id: true, provider: true, appointment: { select: { clientId: true, startsAt: true, endsAt: true, status: true, psychologist: { select: { userId: true } } } } },
  });
  if (!room || room.provider !== "p2p") return null;
  const a = room.appointment;
  if (a.clientId !== user.id && a.psychologist.userId !== user.id) return null;
  if (a.status !== "confirmed" || !joinWindow(a.startsAt, a.endsAt).open) return null;
  return { user, room };
}

export async function GET(req: Request, ctx: RouteContext<"/api/video/[roomId]/signal">) {
  const { roomId } = await ctx.params;
  const auth = await authorise(roomId);
  if (!auth) return new Response("Not found", { status: 404 });
  const after = new URL(req.url).searchParams.get("after");
  const since = after && !Number.isNaN(Date.parse(after)) ? new Date(after) : new Date();
  const signals = await db.videoSignal.findMany({
    where: { roomId, fromUser: { not: auth.user.id }, createdAt: { gt: since } },
    orderBy: { createdAt: "asc" },
    take: 100,
    select: { kind: true, payload: true, createdAt: true },
  });
  return Response.json(
    { now: new Date().toISOString(), signals: signals.map((s) => ({ kind: s.kind, payload: s.payload, at: s.createdAt.toISOString() })) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

const bodySchema = z.object({
  kind: z.enum(["hello", "offer", "answer", "candidate", "bye"]),
  payload: z.string().max(20_000),
});

export async function POST(req: Request, ctx: RouteContext<"/api/video/[roomId]/signal">) {
  const { roomId } = await ctx.params;
  const auth = await authorise(roomId);
  if (!auth) return new Response("Not found", { status: 404 });
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response("Bad request", { status: 400 });
  // Old signals are useless once someone (re)joins.
  if (parsed.data.kind === "hello") {
    await db.videoSignal.deleteMany({ where: { roomId, fromUser: auth.user.id } });
  }
  await db.videoSignal.create({ data: { roomId, fromUser: auth.user.id, ...parsed.data } });
  return Response.json({ ok: true });
}
