import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import { policy } from "@/config/policy";

export interface Indicators {
  /** Median hours to reply to a client message, when there is enough data. */
  replyHours: number | null;
  /** Share of sessions held as scheduled (0-1), when there is enough data. */
  heldRate: number | null;
}

/**
 * Aggregated, non-identifying quality indicators for a public profile.
 * Shown only above minimum sample sizes; never based on individual reviews.
 */
export async function getIndicators(psychologistId: string): Promise<Indicators> {
  "use cache";
  cacheLife("hours");
  cacheTag(`indicators:${psychologistId}`);
  const since = new Date(Date.now() - policy.indicatorWindowDays * 86_400_000);

  const [sessions, psych, messages] = await Promise.all([
    db.appointment.groupBy({
      by: ["status"],
      where: { psychologistId, kind: "session", startsAt: { gte: since, lte: new Date() }, status: { in: ["completed", "cancelled_by_psychologist", "no_show"] } },
      _count: { _all: true },
    }),
    db.psychologistProfile.findUnique({ where: { id: psychologistId }, select: { userId: true } }),
    db.message.findMany({
      where: { createdAt: { gte: since }, conversation: { psychologistId } },
      orderBy: [{ conversationId: "asc" }, { createdAt: "asc" }],
      select: { conversationId: true, senderId: true, createdAt: true },
      take: 5000,
    }),
  ]);

  // Held as scheduled: completed vs. cancelled or moved by the psychologist.
  // Client no-shows are not the psychologist's doing, so they're left out.
  const count = (s: string) => sessions.find((x) => x.status === s)?._count._all ?? 0;
  const completed = count("completed");
  const byPsych = count("cancelled_by_psychologist");
  const heldRate = completed + byPsych >= policy.minSessionsForIndicator ? completed / (completed + byPsych) : null;

  // Reply time: first psychologist message after each run of client messages.
  const delays: number[] = [];
  let waitingSince: Date | null = null;
  let convo = "";
  for (const m of messages) {
    if (m.conversationId !== convo) {
      convo = m.conversationId;
      waitingSince = null;
    }
    const fromPsych = m.senderId === psych?.userId;
    if (!fromPsych && !waitingSince) waitingSince = m.createdAt;
    if (fromPsych && waitingSince) {
      delays.push((m.createdAt.getTime() - waitingSince.getTime()) / 3_600_000);
      waitingSince = null;
    }
  }
  delays.sort((a, b) => a - b);
  const replyHours = delays.length >= policy.minRepliesForIndicator ? delays[Math.floor(delays.length / 2)] : null;

  return { replyHours, heldRate };
}
