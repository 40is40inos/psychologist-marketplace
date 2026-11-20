"use server";

import { redirect } from "next/navigation";
import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { assertPermission } from "@/lib/auth/session";
import { storeUpload, removeStored, verifyUploaded, type StoreError } from "@/lib/storage";
import { readValue } from "@/lib/auth/signed-value";
import { DOCUMENT_TYPES, PHOTO_TYPES, type UploadKind, type UploadTicket } from "@/domain/uploads";
import { isValidAfm, isValidIban, normalizeIban } from "@/lib/validators";
import { onboardingChecklist, ONBOARDING_STEPS, type OnboardingStep } from "@/lib/onboarding";
import { PROFESSIONAL_TITLES } from "@/domain/professional-titles";
import { cleanSlugs } from "@/domain/taxonomy";
import { defaultLocale, isLocale, locales, type Locale } from "@/i18n/config";
import { CURRENT_YEAR } from "@/lib/format";

export interface StepState {
  error?: "invalid" | "iban" | "taxId" | StoreError | "incomplete" | "email_unverified";
  at?: number;
}

async function me() {
  const user = await assertPermission("profile.editOwn");
  const profile = await db.psychologistProfile.findUniqueOrThrow({ where: { userId: user.id }, select: { id: true, slug: true, onboardingStep: true } });
  return { user, profile };
}

function localeOf(fd: FormData): Locale {
  const l = fd.get("locale");
  return typeof l === "string" && isLocale(l) ? l : defaultLocale;
}

/** Remember progress and go to the next step. */
async function advance(fd: FormData, profileId: string, slug: string, step: OnboardingStep): Promise<never> {
  const i = ONBOARDING_STEPS.indexOf(step);
  await db.psychologistProfile.update({ where: { id: profileId }, data: { onboardingStep: { set: Math.max(i + 1, 0) } } });
  updateTag(`profile:${slug}`);
  redirect(`/${localeOf(fd)}/dashboard/profile?step=${ONBOARDING_STEPS[Math.min(i + 1, ONBOARDING_STEPS.length - 1)]}`);
}

const fail = (error: StepState["error"]): StepState => ({ error, at: Date.now() });

type Taken = { key: string; mimeType: string; size: number; filename: string } | { error: StoreError } | null;

/**
 * The file for one upload field: either a ticket for an object the browser
 * already put in the bucket (production), or the file itself (development).
 * Returns null when nothing was chosen.
 */
async function takeUpload(fd: FormData, field: string, kind: UploadKind, profileId: string, folder: string, accept: string[]): Promise<Taken> {
  const rawTicket = fd.get(`${field}Ticket`);
  if (typeof rawTicket === "string" && rawTicket) {
    const ticket = readValue<UploadTicket>("upload", rawTicket);
    if (!ticket || ticket.profileId !== profileId || ticket.kind !== kind) return { error: "empty" };
    const checked = await verifyUploaded(ticket.key, accept);
    return "error" in checked ? checked : { key: ticket.key, filename: ticket.filename, ...checked };
  }
  const file = fd.get(field);
  if (!(file instanceof File) || file.size === 0) return null;
  const stored = await storeUpload(file, `${folder}/${profileId}`, accept);
  return "error" in stored ? stored : { ...stored, filename: file.name.slice(0, 200) };
}

// ─── 1. Personal ────────────────────────────────────────────────────────────

const personalSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(30).regex(/^[+\d\s()-]*$/),
  gender: z.enum(["female", "male", "nonbinary", "undisclosed"]),
  title: z.enum(PROFESSIONAL_TITLES),
  practisingSince: z.coerce.number().int().min(1960).max(CURRENT_YEAR),
});

export async function savePersonal(_p: StepState, fd: FormData): Promise<StepState> {
  const { user, profile } = await me();
  const parsed = personalSchema.safeParse(Object.fromEntries(fd));
  const offered = await db.language.findMany({ where: { active: true }, select: { code: true } });
  const languages = fd.getAll("sessionLanguages").map(String).filter((l) => offered.some((o) => o.code === l));
  if (!parsed.success || languages.length === 0) return fail("invalid");
  const d = parsed.data;
  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { name: d.name, phone: d.phone || null } }),
    db.psychologistProfile.update({ where: { id: profile.id }, data: { gender: d.gender, title: d.title, practisingSince: d.practisingSince, sessionLanguages: languages } }),
  ]);
  return advance(fd, profile.id, profile.slug, "personal");
}

// ─── 2. License ─────────────────────────────────────────────────────────────

export async function saveLicense(_p: StepState, fd: FormData): Promise<StepState> {
  const { profile } = await me();
  const parsed = z
    .object({ licenseNumber: z.string().trim().min(3).max(50), licensingAuthority: z.string().trim().min(2).max(150) })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success) return fail("invalid");

  for (const kind of ["license", "identity"] as const) {
    const stored = await takeUpload(fd, `${kind}File`, kind, profile.id, "documents", DOCUMENT_TYPES);
    if (!stored) continue;
    if ("error" in stored) return fail(stored.error);
    // One current document per kind: replace the previous one.
    const old = await db.document.findMany({ where: { psychologistId: profile.id, kind } });
    await db.document.create({
      data: { psychologistId: profile.id, kind, filename: stored.filename, mimeType: stored.mimeType, sizeBytes: stored.size, storageKey: stored.key },
    });
    for (const o of old) {
      await db.document.delete({ where: { id: o.id } });
      await removeStored(o.storageKey);
    }
  }

  // Changing license details after verification sends the profile back for review.
  const current = await db.psychologistProfile.findUniqueOrThrow({ where: { id: profile.id }, select: { licenseNumber: true, licensingAuthority: true, verificationStatus: true } });
  const changed = current.licenseNumber !== parsed.data.licenseNumber || current.licensingAuthority !== parsed.data.licensingAuthority;
  await db.psychologistProfile.update({
    where: { id: profile.id },
    data: { ...parsed.data, ...(changed && current.verificationStatus === "verified" ? { verificationStatus: "pending", submittedAt: new Date() } : {}) },
  });
  return advance(fd, profile.id, profile.slug, "license");
}

// ─── 3. Credentials ─────────────────────────────────────────────────────────

export async function saveEducation(_p: StepState, fd: FormData): Promise<StepState> {
  const { profile } = await me();
  const degrees = fd.getAll("degree").map(String);
  const institutions = fd.getAll("institution").map(String);
  const years = fd.getAll("year").map(String);
  const rows = degrees
    .map((degree, i) => ({ degree: degree.trim(), institution: (institutions[i] ?? "").trim(), year: years[i] ? Number(years[i]) : null }))
    .filter((r) => r.degree || r.institution);
  if (rows.length === 0 || rows.some((r) => !r.degree || !r.institution || r.degree.length > 200 || r.institution.length > 200 || (r.year !== null && (!Number.isInteger(r.year) || r.year < 1950 || r.year > CURRENT_YEAR)))) {
    return fail("invalid");
  }
  await db.$transaction([
    db.psychologistEducation.deleteMany({ where: { psychologistId: profile.id } }),
    db.psychologistEducation.createMany({ data: rows.map((r, sortOrder) => ({ psychologistId: profile.id, ...r, sortOrder })) }),
  ]);
  return advance(fd, profile.id, profile.slug, "credentials");
}

// ─── 4. Specialties ─────────────────────────────────────────────────────────

export async function saveSpecialties(_p: StepState, fd: FormData): Promise<StepState> {
  const { profile } = await me();
  const wanted = cleanSlugs(["concerns", "approaches", "clientTypes"].flatMap((k) => fd.getAll(k).map(String)), 60);
  const specialties = await db.specialty.findMany({ where: { slug: { in: wanted }, active: true }, select: { id: true, kind: true } });
  const kinds = new Set(specialties.map((s) => s.kind));
  if (!kinds.has("concern") || !kinds.has("approach") || !kinds.has("client_type")) return fail("invalid");
  await db.$transaction([
    db.psychologistSpecialty.deleteMany({ where: { psychologistId: profile.id } }),
    db.psychologistSpecialty.createMany({ data: specialties.map((s) => ({ psychologistId: profile.id, specialtyId: s.id })) }),
  ]);
  return advance(fd, profile.id, profile.slug, "specialties");
}

// ─── 5. Photo, video and bio ────────────────────────────────────────────────

const videoUrl = z.union([z.literal(""), z.url().regex(/^https:\/\/(www\.)?(youtube\.com|youtu\.be|vimeo\.com)\//)]);

export async function saveProfileMedia(_p: StepState, fd: FormData): Promise<StepState> {
  const { profile } = await me();
  const video = videoUrl.safeParse(String(fd.get("videoUrl") ?? "").trim());
  if (!video.success) return fail("invalid");

  const texts = locales.map((locale) => ({
    locale,
    headline: String(fd.get(`headline_${locale}`) ?? "").trim().slice(0, 120),
    bio: String(fd.get(`bio_${locale}`) ?? "").trim().slice(0, 3000),
    approach: String(fd.get(`approach_${locale}`) ?? "").trim().slice(0, 2000),
  }));
  if (!texts.some((t) => t.headline && t.bio)) return fail("invalid");

  let photoUrl: string | undefined;
  const stored = await takeUpload(fd, "photoFile", "photo", profile.id, "photos", PHOTO_TYPES);
  if (stored && "error" in stored) return fail(stored.error);
  if (stored) {
    const old = await db.document.findMany({ where: { psychologistId: profile.id, kind: "photo" } });
    const doc = await db.document.create({
      data: { psychologistId: profile.id, kind: "photo", filename: stored.filename, mimeType: stored.mimeType, sizeBytes: stored.size, storageKey: stored.key },
    });
    photoUrl = `/api/photos/${doc.id}`;
    for (const o of old) {
      await db.document.delete({ where: { id: o.id } });
      await removeStored(o.storageKey);
    }
  }

  await db.$transaction([
    db.psychologistProfile.update({ where: { id: profile.id }, data: { videoUrl: video.data || null, ...(photoUrl && { photoUrl }) } }),
    ...texts.map((t) =>
      t.headline || t.bio
        ? db.psychologistProfileTranslation.upsert({
            where: { psychologistId_locale: { psychologistId: profile.id, locale: t.locale } },
            create: { psychologistId: profile.id, locale: t.locale, headline: t.headline, bio: t.bio, approach: t.approach || null },
            update: { headline: t.headline, bio: t.bio, approach: t.approach || null },
          })
        : db.psychologistProfileTranslation.deleteMany({ where: { psychologistId: profile.id, locale: t.locale } }),
    ),
  ]);
  return advance(fd, profile.id, profile.slug, "profile");
}

/** Prices are saved by savePrices (actions/psychologist.ts); this only moves on. */
export async function continueFromPrices(fd: FormData): Promise<void> {
  const { profile } = await me();
  await advance(fd, profile.id, profile.slug, "prices");
}

// ─── 7. Office ──────────────────────────────────────────────────────────────

const coord = (min: number, max: number) => z.union([z.literal(""), z.coerce.number().min(min).max(max)]);
const officeSchema = z.object({
  addressLine: z.string().trim().min(3).max(200),
  postalCode: z.string().trim().regex(/^\d{3}\s?\d{2}$/),
  city: z.string().min(1),
  latitude: coord(34, 42),
  longitude: coord(19, 30),
});

export async function saveOffice(_p: StepState, fd: FormData): Promise<StepState> {
  const { profile } = await me();
  if (fd.get("onlineOnly") === "on") {
    await db.$transaction([
      db.sessionOffering.updateMany({ where: { psychologistId: profile.id, type: "in_person" }, data: { active: false, officeId: null } }),
      db.office.deleteMany({ where: { psychologistId: profile.id } }),
    ]);
    return advance(fd, profile.id, profile.slug, "offices");
  }
  const parsed = officeSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return fail("invalid");
  const city = await db.city.findFirst({ where: { slug: parsed.data.city }, select: { id: true } });
  if (!city) return fail("invalid");
  const data = {
    cityId: city.id,
    addressLine: parsed.data.addressLine,
    postalCode: parsed.data.postalCode,
    latitude: parsed.data.latitude === "" ? null : parsed.data.latitude,
    longitude: parsed.data.longitude === "" ? null : parsed.data.longitude,
    wheelchairAccessible: fd.get("wheelchair") === "on",
  };
  const existing = await db.office.findFirst({ where: { psychologistId: profile.id } });
  const office = existing ? await db.office.update({ where: { id: existing.id }, data }) : await db.office.create({ data: { psychologistId: profile.id, ...data } });
  await db.sessionOffering.updateMany({ where: { psychologistId: profile.id, type: "in_person" }, data: { officeId: office.id } });
  return advance(fd, profile.id, profile.slug, "offices");
}

// ─── 8. Payout ──────────────────────────────────────────────────────────────

export async function savePayout(_p: StepState, fd: FormData): Promise<StepState> {
  const { profile } = await me();
  const holder = String(fd.get("accountHolder") ?? "").trim();
  const ibanRaw = String(fd.get("iban") ?? "").trim();
  const afm = String(fd.get("taxId") ?? "").replace(/\s+/g, "");
  const taxOffice = String(fd.get("taxOffice") ?? "").trim().slice(0, 100);
  if (holder.length < 2 || holder.length > 140) return fail("invalid");
  if (ibanRaw && !isValidIban(ibanRaw)) return fail("iban");
  if (afm && !isValidAfm(afm)) return fail("taxId");

  const current = await db.psychologistProfile.findUniqueOrThrow({ where: { id: profile.id }, select: { payoutIbanEncrypted: true, taxIdEncrypted: true } });
  if (!ibanRaw && !current.payoutIbanEncrypted) return fail("iban");
  if (!afm && !current.taxIdEncrypted) return fail("taxId");
  const iban = ibanRaw ? normalizeIban(ibanRaw) : null;

  await db.psychologistProfile.update({
    where: { id: profile.id },
    data: {
      payoutAccountHolder: holder,
      taxOffice: taxOffice || null,
      ...(iban && { payoutIbanEncrypted: encrypt(iban), payoutIbanLast4: iban.slice(-4) }),
      ...(afm && { taxIdEncrypted: encrypt(afm) }),
    },
  });
  return advance(fd, profile.id, profile.slug, "payout");
}

// ─── 9. Submit ──────────────────────────────────────────────────────────────

export async function submitForVerification(_p: StepState, fd: FormData): Promise<StepState> {
  const { user, profile } = await me();
  const checklist = await onboardingChecklist(profile.id);
  if (Object.values(checklist).some((v) => !v)) return fail("incomplete");
  // Clients and admins must be able to reach a verified professional.
  const { emailVerifiedAt } = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { emailVerifiedAt: true } });
  if (!emailVerifiedAt) return fail("email_unverified");
  await db.psychologistProfile.update({
    where: { id: profile.id },
    // Psychologists usually want to appear in search once approved.
    data: { submittedAt: new Date(), published: true },
  });
  refresh();
  redirect(`/${localeOf(fd)}/dashboard`);
}

/** Remove an uploaded verification document. */
export async function removeDocument(fd: FormData): Promise<void> {
  const { profile } = await me();
  const id = z.string().min(1).parse(fd.get("documentId"));
  const doc = await db.document.findFirst({ where: { id, psychologistId: profile.id, kind: { not: "photo" } } });
  if (doc) {
    await db.document.delete({ where: { id: doc.id } });
    await removeStored(doc.storageKey);
  }
  refresh();
}
