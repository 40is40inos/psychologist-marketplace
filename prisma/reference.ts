/**
 * Reference data every environment needs, including production: the market,
 * cities, taxonomy, session languages, plans and starter CMS/legal pages.
 * Idempotent and never overwrites admin edits. No user accounts.
 *
 *   npm run db:setup       (production: after the first migrate deploy)
 *
 * The development seed (seed.ts) calls this first, then adds demo data.
 */
import type { PrismaClient } from "../src/generated/prisma/client";
import { SESSION_LANGUAGES, SPECIALTY_KINDS } from "../src/domain/taxonomy";
import en from "../src/i18n/dictionaries/en";
import el from "../src/i18n/dictionaries/el";
import { cities } from "./seed-data";
import { content } from "./seed-content";
import { legalContent, TEMPLATE_NOTE } from "./seed-legal";

export async function seedReference(db: PrismaClient): Promise<{ cityIds: Map<string, string>; specialtyIds: Map<string, string> }> {
  // ── Market, cities, taxonomy ──
  await db.country.upsert({ where: { code: "GR" }, create: { code: "GR", timeZone: "Europe/Athens", enabled: true }, update: {} });
  const cityIds = new Map<string, string>();
  for (const c of cities) {
    const city = await db.city.upsert({
      where: { countryCode_slug: { countryCode: "GR", slug: c.slug } },
      create: { countryCode: "GR", slug: c.slug, latitude: c.lat, longitude: c.lng },
      update: { latitude: c.lat, longitude: c.lng },
    });
    cityIds.set(c.slug, city.id);
    for (const locale of ["el", "en"] as const) {
      await db.cityTranslation.upsert({
        where: { cityId_locale: { cityId: city.id, locale } },
        create: { cityId: city.id, locale, name: c.name[locale] },
        update: { name: c.name[locale] },
      });
    }
  }
  const specialtyIds = new Map<string, string>();
  const dictKey = { concern: "concerns", approach: "approaches", client_type: "clientTypes" } as const;
  for (const [kind, slugs] of Object.entries(SPECIALTY_KINDS)) {
    for (const [sortOrder, slug] of slugs.entries()) {
      const key = dictKey[kind as keyof typeof dictKey];
      const labels = {
        el: (el.taxonomy[key] as Record<string, string>)[slug],
        en: (en.taxonomy[key] as Record<string, string>)[slug],
      };
      // Labels are only filled in on first run so admin edits survive re-seeding.
      const s = await db.specialty.upsert({ where: { slug }, create: { slug, kind: kind as "concern", labels, sortOrder }, update: {} });
      if (!s.labels || Object.keys(s.labels as object).length === 0) await db.specialty.update({ where: { id: s.id }, data: { labels, sortOrder } });
      specialtyIds.set(slug, s.id);
    }
  }
  for (const [sortOrder, code] of SESSION_LANGUAGES.entries()) {
    await db.language.upsert({
      where: { code },
      create: { code, labels: { el: el.languages[code], en: en.languages[code] }, sortOrder },
      update: {},
    });
  }

  await db.plan.upsert({
    where: { slug: "basic" },
    create: { slug: "basic", name: { el: "Βασικό", en: "Basic" }, monthlyPriceCents: 0, commissionBps: 1500, features: ["video", "invoicing"], isDefault: true, sortOrder: 0 },
    update: {},
  });
  await db.plan.upsert({
    where: { slug: "pro" },
    create: { slug: "pro", name: { el: "Pro", en: "Pro" }, monthlyPriceCents: 3900, commissionBps: 0, features: ["video", "invoicing", "analytics", "calendar_sync", "featured"], sortOrder: 1 },
    update: {},
  });

  // ── CMS starter content (only created if missing, so admin edits survive) ──
  for (const c of [...content, ...legalContent]) {
    const exists = await db.contentPage.findUnique({ where: { kind_slug: { kind: c.kind, slug: c.slug } }, include: { translations: true } });
    if (exists) {
      // Refresh legal templates nobody has edited yet (they still start with the template note).
      const untouched = exists.translations.length > 0 && exists.translations.every((t) => t.body.startsWith(TEMPLATE_NOTE[t.locale as "el" | "en"]));
      if (legalContent.includes(c) && untouched) {
        for (const locale of ["el", "en"] as const) {
          await db.contentTranslation.upsert({
            where: { pageId_locale: { pageId: exists.id, locale } },
            create: { pageId: exists.id, locale, title: c[locale].title, body: c[locale].body },
            update: { title: c[locale].title, body: c[locale].body },
          });
        }
      }
      continue;
    }
    await db.contentPage.create({
      data: {
        kind: c.kind, slug: c.slug, status: "published", publishedAt: new Date(), authorId: null,
        translations: { create: (["el", "en"] as const).map((locale) => ({ locale, title: c[locale].title, excerpt: c[locale].excerpt ?? null, body: c[locale].body })) },
      },
    });
  }

  return { cityIds, specialtyIds };
}
