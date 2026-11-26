import { privatePageMetadata } from "@/lib/page-metadata";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock, MessageCircle, Trash2 } from "lucide-react";
import { addNote, deleteNote } from "@/actions/notes";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { formatShortDate, formatTime } from "@/lib/format";
import { requirePsychologist } from "@/lib/workspace";
import { hoursUntil } from "@/lib/time";
import { logAccess } from "@/lib/audit";
import { AppointmentRow } from "@/components/appointment-row";
import { ActionForm } from "@/components/ui/action-form";
import { buttonClass, textareaClass, inputClass } from "@/components/ui/form";
import { PageSkeleton } from "@/components/ui/page-skeleton";

export const generateMetadata = privatePageMetadata((d) => d.clientsPage.title);

export default function ClientPage(props: PageProps<"/[lang]/dashboard/clients/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Client {...props} />
    </Suspense>
  );
}

const read = (enc: string | null) => {
  if (!enc) return null;
  try {
    return decrypt(enc);
  } catch {
    return null;
  }
};

async function Client({ params }: PageProps<"/[lang]/dashboard/clients/[id]">) {
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const { user, profileId } = await requirePsychologist(lang, `/${lang}/dashboard/clients/${id}`);
  const t = dict.clientsPage;

  const appts = await db.appointment.findMany({
    where: { psychologistId: profileId, clientId: id, rescheduledTo: null },
    orderBy: { startsAt: "desc" },
    include: { client: { select: { name: true } }, intake: { select: { answersEncrypted: true } } },
  });
  // Only people this psychologist has a booking with.
  if (appts.length === 0) notFound();
  const [notes, conversation] = await Promise.all([
    db.sessionNote.findMany({ where: { psychologistId: profileId, clientId: id }, orderBy: { createdAt: "desc" } }),
    db.conversation.findUnique({ where: { clientId_psychologistId: { clientId: id, psychologistId: profileId } }, select: { id: true } }),
  ]);
  const name = appts[0].client.name;
  logAccess(user.id, "client_record.view", "User", id);
  const latestIntake = appts.map((a) => read(a.intake?.answersEncrypted ?? null)).find(Boolean);
  const intake = latestIntake ? (JSON.parse(latestIntake) as { reason?: string; notes?: string }) : null;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={`/${lang}/dashboard/clients`} className="text-sm font-medium text-primary hover:underline">← {t.title}</Link>
          <h1 className="mt-2 font-display text-2xl font-semibold text-ink">{name}</h1>
        </div>
        {conversation && (
          <Link href={`/${lang}/dashboard/messages/${conversation.id}`} className={buttonClass.secondary}>
            <MessageCircle className="size-4" aria-hidden="true" />{t.message}
          </Link>
        )}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section aria-labelledby="notes" className="space-y-3">
          <h2 id="notes" className="text-lg font-semibold text-ink">{t.notes}</h2>
          <p className="flex gap-2 text-sm text-muted"><Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{t.notesHint}</p>
          <div className="rounded-2xl border border-border bg-surface p-4">
            <ActionForm action={addNote} submitLabel={t.addNote} errors={{ invalid: dict.workspace.saveError }} resetOnSuccess>
              <input type="hidden" name="clientId" value={id} />
              <label className="block">
                <span className="sr-only">{t.addNote}</span>
                <textarea name="body" rows={4} required maxLength={20000} placeholder={t.notePlaceholder} className={textareaClass} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">{t.linkSession}</span>
                <select name="appointmentId" className={`${inputClass} appearance-none`} defaultValue="">
                  <option value="">{t.noSession}</option>
                  {appts.filter((a) => hoursUntil(a.startsAt) <= 24).map((a) => (
                    <option key={a.id} value={a.id}>{formatShortDate(a.startsAt, lang)}, {formatTime(a.startsAt, lang)}</option>
                  ))}
                </select>
              </label>
            </ActionForm>
          </div>
          {notes.length === 0 ? (
            <p className="text-sm text-muted">{t.noNotes}</p>
          ) : (
            <ul className="space-y-3">
              {notes.map((n) => {
                const linked = appts.find((a) => a.id === n.appointmentId);
                return (
                  <li key={n.id} className="rounded-2xl border border-border bg-surface p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-xs text-muted">
                        {formatShortDate(n.createdAt, lang)} {formatTime(n.createdAt, lang)}
                        {linked && ` · ${dict.apptPage.title}: ${formatShortDate(linked.startsAt, lang)}`}
                      </p>
                      <form action={deleteNote}>
                        <input type="hidden" name="noteId" value={n.id} />
                        <button type="submit" aria-label={t.deleteNote} className="grid size-8 place-items-center rounded-lg text-muted hover:text-accent"><Trash2 className="size-4" aria-hidden="true" /></button>
                      </form>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-ink">{read(n.bodyEncrypted) ?? "…"}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-labelledby="history" className="space-y-3">
          {intake && (intake.reason || intake.notes) && (
            <div className="rounded-2xl bg-surface-muted/60 p-4 text-sm">
              <h2 className="font-semibold text-ink">{t.intake}</h2>
              {intake.reason && <p className="mt-1 whitespace-pre-line text-ink">{intake.reason}</p>}
              {intake.notes && <p className="mt-1 whitespace-pre-line text-muted">{intake.notes}</p>}
            </div>
          )}
          <h2 id="history" className="text-lg font-semibold text-ink">{t.history}</h2>
          <ul className="divide-y divide-border rounded-2xl border border-border bg-surface px-4">
            {appts.map((a) => (
              <AppointmentRow
                key={a.id}
                locale={lang}
                dict={dict}
                href={`/${lang}/dashboard/appointments#${a.id}`}
                a={{ id: a.id, startsAt: a.startsAt, sessionType: a.sessionType, kind: a.kind, status: a.status, priceCents: a.priceCents, counterpart: name, lateCancellation: a.lateCancellation }}
              />
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
