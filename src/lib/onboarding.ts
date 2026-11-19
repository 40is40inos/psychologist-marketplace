import "server-only";
import { db } from "@/lib/db";

export const ONBOARDING_STEPS = ["personal", "license", "credentials", "specialties", "profile", "prices", "offices", "payout", "review"] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

/** Which steps are complete, for the wizard checklist and submit gate. */
export async function onboardingChecklist(psychologistId: string): Promise<Record<Exclude<OnboardingStep, "review">, boolean>> {
  const p = await db.psychologistProfile.findUniqueOrThrow({
    where: { id: psychologistId },
    select: {
      practisingSince: true,
      sessionLanguages: true,
      licenseNumber: true,
      photoUrl: true,
      payoutIbanEncrypted: true,
      taxIdEncrypted: true,
      _count: { select: { education: true, offices: true } },
      documents: { select: { kind: true } },
      specialties: { select: { specialty: { select: { kind: true } } } },
      translations: { select: { headline: true, bio: true } },
      offerings: { where: { active: true }, select: { type: true } },
    },
  });
  const kinds = new Set(p.specialties.map((s) => s.specialty.kind));
  const hasInPerson = p.offerings.some((o) => o.type === "in_person");
  return {
    personal: !!p.practisingSince && p.sessionLanguages.length > 0,
    license: !!p.licenseNumber && p.documents.some((d) => d.kind === "license") && p.documents.some((d) => d.kind === "identity"),
    credentials: p._count.education > 0,
    specialties: kinds.has("concern") && kinds.has("approach") && kinds.has("client_type"),
    profile: !!p.photoUrl && p.translations.some((t) => t.headline && t.bio),
    prices: p.offerings.length > 0,
    // An office is required only when in-person sessions are offered.
    offices: !hasInPerson || p._count.offices > 0,
    payout: !!p.payoutIbanEncrypted && !!p.taxIdEncrypted,
  };
}
