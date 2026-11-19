import "server-only";
import { db } from "@/lib/db";

/**
 * Video sessions in the browser, no download.
 *
 * - With DAILY_API_KEY set, rooms are private Daily.co rooms (recommended for
 *   production: TURN relays, EU data centres, reliable on mobile networks).
 *   Each participant gets a short-lived meeting token.
 * - Without it, the built-in peer-to-peer WebRTC room is used (signalling
 *   through our own API). Good for development; add a TURN server
 *   (NEXT_PUBLIC_TURN_*) for real-world networks.
 */
export const JOIN_EARLY_MINUTES = 10;
export const JOIN_LATE_MINUTES = 30;

export type VideoJoin =
  | { provider: "daily"; url: string }
  | { provider: "p2p"; roomId: string; role: "host" | "guest" };

const DAILY = "https://api.daily.co/v1";

async function daily(path: string, body: unknown) {
  const res = await fetch(`${DAILY}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.DAILY_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Daily ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

/** Is the room open for this appointment right now? */
export function joinWindow(startsAt: Date, endsAt: Date, now = Date.now()) {
  const opens = startsAt.getTime() - JOIN_EARLY_MINUTES * 60_000;
  const closes = endsAt.getTime() + JOIN_LATE_MINUTES * 60_000;
  return { open: now >= opens && now <= closes, ended: now > closes, opens: new Date(opens), closes: new Date(closes) };
}

export async function joinVideo(
  appointment: { id: string; startsAt: Date; endsAt: Date },
  user: { id: string; name: string },
  isHost: boolean,
): Promise<VideoJoin> {
  const existing = await db.videoRoom.findUnique({ where: { appointmentId: appointment.id } });
  const useDaily = !!process.env.DAILY_API_KEY;

  let room = existing;
  if (!room) {
    if (useDaily) {
      const exp = Math.floor(appointment.endsAt.getTime() / 1000) + JOIN_LATE_MINUTES * 60;
      const created = await daily("/rooms", {
        privacy: "private",
        properties: { exp, max_participants: 2, enable_chat: true, enable_screenshare: true, enable_recording: false },
      });
      room = await db.videoRoom.create({ data: { appointmentId: appointment.id, provider: "daily", providerRef: created.url } });
    } else {
      room = await db.videoRoom.create({ data: { appointmentId: appointment.id, provider: "p2p", providerRef: "p2p" } });
    }
  }

  if (room.provider === "daily") {
    const roomName = new URL(room.providerRef).pathname.slice(1);
    const { token } = await daily("/meeting-tokens", {
      properties: { room_name: roomName, user_name: user.name, is_owner: isHost, exp: Math.floor(Date.now() / 1000) + 3 * 3600 },
    });
    return { provider: "daily", url: `${room.providerRef}?t=${token}` };
  }
  return { provider: "p2p", roomId: room.id, role: isHost ? "host" : "guest" };
}
