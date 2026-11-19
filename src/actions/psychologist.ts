"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/auth/session";
import { SESSION_TYPES } from "@/domain/session-types";
import { locales } from "@/i18n/config";
import { CURRENT_YEAR } from "@/lib/format";

export interface SaveState {
  ok?: boolean;
  error?: boolean;
  /** Changes on every submit so the "Saved" message re-announces. */
  at?: number;
}

async function ownProfileId(): Promise<string> {
  const user = await assertPermission("profile.editOwn");
  const profile = await db.psychologistProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!profile) throw new Error("Psychologist profile not found");
  return profile.id;
}

// ─── Profile text ───────────────────────────────────────────────────────────

const text = (max: number) => z.string().trim().max(max);

const profileSchema = z.object({
  practisingSince: z.union([
    z.literal(""),
    z.coerce.number().int().min(1960).max(CURRENT_YEAR),
  ]),
  sessionLanguages: z.array(z.enum(["el", "en", "fr", "de"])).min(1),
  published: z.boolean(),
  translations: z.array(
    z.object({
      locale: z.enum(locales),
      headline: text(120),
      bio: text(3000),
      approach: text(2000),
    }),
  ),
});

export async function saveProfile(_prev: SaveState, formData: FormData): Promise<SaveState> {
  const profileId = await ownProfileId();

  const parsed = profileSchema.safeParse({
    practisingSince: formData.get("practisingSince") ?? "",
    sessionLanguages: formData.getAll("sessionLanguages"),
    published: formData.get("published") === "on",
    translations: locales.map((locale) => ({
      locale,
      headline: formData.get(`headline_${locale}`) ?? "",
      bio: formData.get(`bio_${locale}`) ?? "",
      approach: formData.get(`approach_${locale}`) ?? "",
    })),
  });
  if (!parsed.success) return { error: true, at: Date.now() };

  const { practisingSince, sessionLanguages, published, translations } = parsed.data;

  await db.$transaction([
    db.psychologistProfile.update({
      where: { id: profileId },
      data: {
        practisingSince: practisingSince === "" ? null : practisingSince,
        sessionLanguages,
        published,
      },
    }),
    // A language with an empty headline and bio is treated as "not written".
    ...translations.map((t) =>
      t.headline || t.bio
        ? db.psychologistProfileTranslation.upsert({
            where: { psychologistId_locale: { psychologistId: profileId, locale: t.locale } },
            create: { psychologistId: profileId, locale: t.locale, headline: t.headline, bio: t.bio, approach: t.approach || null },
            update: { headline: t.headline, bio: t.bio, approach: t.approach || null },
          })
        : db.psychologistProfileTranslation.deleteMany({
            where: { psychologistId: profileId, locale: t.locale },
          }),
    ),
  ]);

  refresh();
  return { ok: true, at: Date.now() };
}

// ─── Prices ─────────────────────────────────────────────────────────────────

const offeringSchema = z.object({
  type: z.enum(SESSION_TYPES),
  active: z.boolean(),
  durationMinutes: z.coerce.number().int().min(20).max(180),
  /** Whole euros or cents with a comma or dot, e.g. "60", "60,50". */
  price: z
    .string()
    .trim()
    .regex(/^\d{1,4}([.,]\d{1,2})?$/)
    .transform((v) => Math.round(Number(v.replace(",", ".")) * 100))
    .pipe(z.number().int().min(1000).max(100000)),
});

export async function savePrices(_prev: SaveState, formData: FormData): Promise<SaveState> {
  await assertPermission("pricing.editOwn");
  const profileId = await ownProfileId();

  const rows = SESSION_TYPES.map((type) => ({
    type,
    active: formData.get(`active_${type}`) === "on",
    durationMinutes: formData.get(`duration_${type}`) ?? "50",
    price: String(formData.get(`price_${type}`) ?? ""),
  }));

  // Inactive formats may have an empty price; validate only what's offered.
  const parsed = rows.map((row) =>
    row.active || row.price ? offeringSchema.safeParse(row) : null,
  );
  if (parsed.some((p) => p && !p.success)) return { error: true, at: Date.now() };

  await db.$transaction(async (tx) => {
    for (const [i, p] of parsed.entries()) {
      const type = SESSION_TYPES[i];
      if (!p?.success) {
        await tx.sessionOffering.updateMany({ where: { psychologistId: profileId, type }, data: { active: false } });
        continue;
      }
      const { active, durationMinutes, price } = p.data;
      await tx.sessionOffering.upsert({
        where: { psychologistId_type: { psychologistId: profileId, type } },
        create: { psychologistId: profileId, type, active, durationMinutes, priceCents: price },
        update: { active, durationMinutes, priceCents: price },
      });
    }
  });

  refresh();
  return { ok: true, at: Date.now() };
}
