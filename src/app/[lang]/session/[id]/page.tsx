import { privatePageMetadata } from "@/lib/page-metadata";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { fill, formatShortDate, formatTime } from "@/lib/format";
import { displayName } from "@/lib/slug";
import { JOIN_EARLY_MINUTES, joinVideo, joinWindow } from "@/lib/video";
import { P2PCall } from "@/components/video/p2p-call";
import { PageSkeleton } from "@/components/ui/page-skeleton";

export const generateMetadata = privatePageMetadata((d) => d.video.title);

export default function SessionPage(props: PageProps<"/[lang]/session/[id]">) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <Suspense fallback={<PageSkeleton />}>
        <Room {...props} />
      </Suspense>
    </div>
  );
}

async function Room({ params }: PageProps<"/[lang]/session/[id]">) {
  await connection();
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const user = await requireUser(lang, `/${lang}/session/${id}`);
  const t = dict.video;

  const a = await db.appointment.findUnique({
    where: { id },
    include: { client: { select: { name: true } }, psychologist: { select: { userId: true, user: { select: { name: true } } } } },
  });
  const isHost = a?.psychologist.userId === user.id;
  if (!a || (!isHost && a.clientId !== user.id) || a.sessionType === "in_person") notFound();

  const otherName = isHost ? a.client.name : displayName(a.psychologist.user.name, lang);
  const back = isHost ? `/${lang}/dashboard/appointments` : `/${lang}/account/appointments/${a.id}`;
  const win = joinWindow(a.startsAt, a.endsAt);
  const header = (
    <div className="mb-4">
      <h1 className="font-display text-2xl font-semibold text-ink">{fill(t.with, { name: otherName })}</h1>
      <p className="text-sm text-muted">{formatShortDate(a.startsAt, lang)}, {formatTime(a.startsAt, lang)}–{formatTime(a.endsAt, lang)}</p>
    </div>
  );

  if (a.status !== "confirmed" || win.ended) {
    return <>{header}<p className="rounded-2xl bg-surface-muted p-6 text-muted">{t.closed}</p></>;
  }
  if (!win.open) {
    return <>{header}<p className="rounded-2xl bg-surface-muted p-6 text-muted">{fill(t.notOpen, { minutes: JOIN_EARLY_MINUTES })}</p></>;
  }

  const join = await joinVideo(a, { id: user.id, name: user.name }, isHost);
  return (
    <>
      {header}
      {join.provider === "daily" ? (
        <iframe
          src={join.url}
          title={t.title}
          allow="camera; microphone; fullscreen; display-capture; autoplay"
          className="aspect-video w-full rounded-2xl border border-border"
        />
      ) : (
        <P2PCall roomId={join.roomId} role={join.role} otherName={otherName} t={t} onLeave={back} />
      )}
      <p className="mt-4 text-sm text-muted">{t.notForEmergency}</p>
    </>
  );
}
