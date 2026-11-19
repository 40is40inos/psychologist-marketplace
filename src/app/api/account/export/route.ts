import { db } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { getCurrentUser } from "@/lib/auth/session";
import { logAccess } from "@/lib/audit";

const read = (enc: string | null) => {
  if (!enc) return null;
  try {
    return decrypt(enc);
  } catch {
    return null;
  }
};

/**
 * Right of access and portability (GDPR Art. 15 and 20): everything we hold
 * about the signed-in person, decrypted, as JSON. Psychologists' private
 * clinical notes are the psychologist's records and are not included.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const [profile, appointments, messages, feedback, consents, saved, clientProfile, profileData] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { id: true, email: true, name: true, phone: true, role: true, locale: true, createdAt: true, lastSignInAt: true, emailReminders: true, smsReminders: true, smsHideBrand: true, totpEnabledAt: true },
    }),
    db.appointment.findMany({
      where: { clientId: user.id },
      orderBy: { startsAt: "asc" },
      select: {
        id: true, startsAt: true, endsAt: true, sessionType: true, kind: true, status: true, priceCents: true, currency: true, createdAt: true,
        intake: { select: { answersEncrypted: true, submittedAt: true } },
        psychologist: { select: { slug: true, user: { select: { name: true } } } },
        payment: { select: { amountCents: true, status: true, method: true, paidAt: true, receiptNumber: true, refundedCents: true } },
      },
    }),
    db.message.findMany({
      where: { conversation: { OR: [{ clientId: user.id }, { psychologist: { userId: user.id } }] } },
      orderBy: { createdAt: "asc" },
      select: { conversationId: true, senderId: true, createdAt: true, bodyEncrypted: true },
    }),
    db.feedback.findMany({ where: { clientId: user.id }, select: { appointmentId: true, rating: true, comment: true, createdAt: true } }),
    db.consentRecord.findMany({ where: { userId: user.id }, orderBy: { grantedAt: "asc" }, select: { kind: true, version: true, grantedAt: true, withdrawnAt: true } }),
    db.savedPsychologist.findMany({ where: { userId: user.id }, select: { createdAt: true, psychologist: { select: { slug: true } } } }),
    db.clientProfile.findUnique({ where: { userId: user.id }, select: { preferredLanguage: true, preferredSessionType: true, matchAnswersEncrypted: true, matchSavedAt: true } }),
    user.role === "psychologist"
      ? db.psychologistProfile.findUnique({
          where: { userId: user.id },
          select: { slug: true, title: true, licenseNumber: true, licensingAuthority: true, verificationStatus: true, sessionLanguages: true, translations: true, offerings: true, education: true, payoutAccountHolder: true, payoutIbanLast4: true, taxOffice: true },
        })
      : null,
  ]);

  logAccess(user.id, "data.export", "User", user.id);
  const body = {
    exportedAt: new Date().toISOString(),
    account: profile,
    psychologistProfile: profileData,
    clientProfile: clientProfile && {
      preferredLanguage: clientProfile.preferredLanguage,
      preferredSessionType: clientProfile.preferredSessionType,
      savedMatchAnswers: read(clientProfile.matchAnswersEncrypted),
      matchSavedAt: clientProfile.matchSavedAt,
    },
    appointments: appointments.map(({ intake, ...a }) => {
      const text = read(intake?.answersEncrypted ?? null);
      return { ...a, intake: text ? { ...JSON.parse(text), submittedAt: intake!.submittedAt } : null };
    }),
    messages: messages.map((m) => ({ conversationId: m.conversationId, fromMe: m.senderId === user.id, sentAt: m.createdAt, text: read(m.bodyEncrypted) })),
    feedback,
    consents,
    savedPsychologists: saved.map((s) => ({ slug: s.psychologist.slug, savedAt: s.createdAt })),
  };
  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="my-data-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
