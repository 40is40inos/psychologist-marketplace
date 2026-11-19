/**
 * Development seed: Greece, cities, taxonomy, one admin, one client, ten
 * verified psychologists with hours and prices, two pending applications,
 * appointments, payments, a conversation and an open dispute.
 * Safe to run more than once.
 *
 *   npx prisma db seed
 *
 * Accounts use SEED_ADMIN_EMAIL and SEED_PASSWORD from .env. Never run
 * against production.
 */
import "dotenv/config";
import { createCipheriv, randomBytes, scrypt } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { SESSION_LANGUAGES, SPECIALTY_KINDS } from "../src/domain/taxonomy";
import en from "../src/i18n/dictionaries/en";
import el from "../src/i18n/dictionaries/el";
import { cities, psychologists, toMinutes } from "./seed-data";
import { content } from "./seed-content";
import { legalContent, TEMPLATE_NOTE } from "./seed-legal";

if (process.env.NODE_ENV === "production") throw new Error("Refusing to seed in production");

const password = process.env.SEED_PASSWORD;
const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@example.test";
if (!password || password.length < 10) throw new Error("Set SEED_PASSWORD (10+ chars) in .env");

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

// Same formats as src/lib/auth/password.ts and src/lib/crypto.ts (those are server-only).
function hash(pw: string): Promise<string> {
  const N = 2 ** 15, r = 8, p = 1, salt = randomBytes(16);
  return new Promise((resolve, reject) =>
    scrypt(pw.normalize("NFKC"), salt, 64, { N, r, p, maxmem: 128 * N * r * 2 }, (err, key) =>
      err ? reject(err) : resolve(["scrypt", N, r, p, salt.toString("base64"), key.toString("base64")].join("$")),
    ),
  );
}
function encrypt(plain: string): string {
  const key = Buffer.from(process.env.DATA_ENCRYPTION_KEY ?? "", "base64");
  if (key.length !== 32) throw new Error("Set DATA_ENCRYPTION_KEY in .env");
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64url"), c.getAuthTag().toString("base64url"), data.toString("base64url")].join(".");
}

async function main() {
  const passwordHash = await hash(password!);

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

  const user = (email: string, name: string, role: "client" | "psychologist" | "admin", locale: "el" | "en" = "el") =>
    db.user.upsert({
      where: { email },
      create: { email, name, role, locale, passwordHash, emailVerifiedAt: new Date(), ...(role === "client" && { clientProfile: { create: {} } }) },
      update: { passwordHash, status: "active" },
    });

  const admin = await user(adminEmail, "Admin", "admin", "en");
  const client = await user("client@example.test", "Άννα Δημητρίου", "client");
  if ((await db.consentRecord.count({ where: { userId: client.id } })) === 0) {
    await db.consentRecord.createMany({ data: (["terms", "privacy", "health_data"] as const).map((kind) => ({ userId: client.id, kind, version: "2026-11" })) });
  }

  // ── Verified psychologists ──
  const profiles = new Map<string, { id: string; offerings: { type: "in_person" | "video" | "phone"; priceCents: number; minutes: number }[] }>();
  for (const [i, p] of psychologists.entries()) {
    const u = await user(`psychologist${i + 1}@example.test`, p.name.el, "psychologist");
    const profile = await db.psychologistProfile.upsert({
      where: { userId: u.id },
      create: {
        userId: u.id, slug: p.slug, countryCode: "GR", title: p.title, gender: p.gender,
        licenseNumber: `GR-${10000 + i * 137}`, licensingAuthority: "Περιφέρεια Αττικής",
        verificationStatus: "verified", verifiedAt: new Date(), verifiedById: admin.id,
        practisingSince: p.since, sessionLanguages: p.languages, published: true,
        introCallEnabled: !!p.introCall, videoUrl: p.video ?? null,
      },
      update: { gender: p.gender, introCallEnabled: !!p.introCall, sessionLanguages: p.languages },
    });

    for (const locale of ["el", "en"] as const) {
      await db.psychologistProfileTranslation.upsert({
        where: { psychologistId_locale: { psychologistId: profile.id, locale } },
        create: { psychologistId: profile.id, locale, headline: p.headline[locale], bio: p.bio[locale], approach: p.approachText[locale] },
        update: { headline: p.headline[locale], bio: p.bio[locale], approach: p.approachText[locale] },
      });
    }

    // Replace child rows wholesale so re-running stays in sync with seed-data.
    await db.psychologistSpecialty.deleteMany({ where: { psychologistId: profile.id } });
    await db.psychologistSpecialty.createMany({
      data: [...p.concerns, ...p.approaches, ...p.clientTypes].map((slug) => ({ psychologistId: profile.id, specialtyId: specialtyIds.get(slug)! })),
    });
    await db.availabilityRule.deleteMany({ where: { psychologistId: profile.id } });
    await db.availabilityRule.createMany({
      data: p.hours.map(([weekday, from, to, types]) => ({
        psychologistId: profile.id, weekday, startMinute: toMinutes(from), endMinute: toMinutes(to), sessionTypes: types ?? [],
      })),
    });
    await db.psychologistEducation.deleteMany({ where: { psychologistId: profile.id } });
    await db.psychologistEducation.createMany({
      data: p.education.map((e, sortOrder) => ({ psychologistId: profile.id, ...e, sortOrder })),
    });
    await db.psychologistFaq.deleteMany({ where: { psychologistId: profile.id } });
    if (p.faq) {
      await db.psychologistFaq.createMany({
        data: p.faq.flatMap((f, sortOrder) =>
          (["el", "en"] as const).map((locale) => ({ psychologistId: profile.id, locale, question: f.q[locale], answer: f.a[locale], sortOrder })),
        ),
      });
    }

    let officeId: string | null = null;
    if (p.office) {
      const existing = await db.office.findFirst({ where: { psychologistId: profile.id } });
      const data = {
        cityId: cityIds.get(p.office.city)!, addressLine: p.office.address, postalCode: p.office.postal,
        latitude: p.office.lat, longitude: p.office.lng, wheelchairAccessible: !!p.office.wheelchair,
      };
      officeId = existing
        ? (await db.office.update({ where: { id: existing.id }, data })).id
        : (await db.office.create({ data: { psychologistId: profile.id, ...data } })).id;
    }
    for (const o of p.offerings) {
      const data = { durationMinutes: o.minutes, priceCents: o.euros * 100, active: true, officeId: o.type === "in_person" ? officeId : null };
      await db.sessionOffering.upsert({
        where: { psychologistId_type: { psychologistId: profile.id, type: o.type } },
        create: { psychologistId: profile.id, type: o.type, ...data },
        update: data,
      });
    }
    profiles.set(p.slug, { id: profile.id, offerings: p.offerings.map((o) => ({ type: o.type, priceCents: o.euros * 100, minutes: o.minutes })) });
  }

  // ── Pending applications for the admin queue ──
  const applicants = [
    { email: "applicant1@example.test", name: "Κατερίνα Λαμπρίδου", license: "GR-48211", authority: "Περιφέρεια Κεντρικής Μακεδονίας" },
    { email: "applicant2@example.test", name: "Petros Antoniou", license: "GR-50973", authority: "Περιφέρεια Κρήτης" },
  ];
  for (const a of applicants) {
    const u = await user(a.email, a.name, "psychologist");
    await db.psychologistProfile.upsert({
      where: { userId: u.id },
      create: { userId: u.id, slug: a.email.split("@")[0], countryCode: "GR", title: "psychologist", licenseNumber: a.license, licensingAuthority: a.authority, sessionLanguages: ["el"] },
      update: {},
    });
  }

  // ── Client history (first run only) ──
  if ((await db.appointment.count({ where: { clientId: client.id } })) === 0) {
    const eleni = profiles.get("eleni-papadopoulou")!;
    const maria = profiles.get("maria-konstantinou")!;
    const day = 86_400_000;
    // 09:00 or 10:00 Athens time on a weekday in the past/future.
    const at = (offsetDays: number, hourUtc: number) => {
      const d = new Date(Date.now() + offsetDays * day);
      while ([0, 6].includes(d.getUTCDay())) d.setUTCDate(d.getUTCDate() + 1);
      d.setUTCHours(hourUtc, 0, 0, 0);
      return d;
    };
    let receipt = 1;
    const make = async (
      p: typeof eleni, type: "in_person" | "video", start: Date,
      status: "confirmed" | "completed" | "no_show", paid: boolean,
    ) => {
      const o = p.offerings.find((x) => x.type === type)!;
      return db.appointment.create({
        data: {
          clientId: client.id, psychologistId: p.id, sessionType: type, status, startsAt: start,
          endsAt: new Date(start.getTime() + o.minutes * 60_000), priceCents: o.priceCents, locale: "el",
          payment: {
            create: {
              amountCents: o.priceCents, method: "pay_at_session",
              status: paid ? "paid" : "pending",
              paidAt: paid ? start : null,
              receiptNumber: paid ? `R-${start.getUTCFullYear()}-${String(receipt++).padStart(6, "0")}` : null,
            },
          },
        },
      });
    };

    await make(eleni, "in_person", at(-21, 7), "completed", true);
    await make(eleni, "in_person", at(-14, 7), "completed", true);
    const missed = await make(maria, "video", at(-5, 8), "no_show", false);
    await make(eleni, "in_person", at(3, 7), "confirmed", false);
    await make(maria, "video", at(8, 7), "confirmed", false);

    await db.dispute.create({
      data: { appointmentId: missed.id, openedById: client.id, reason: "Συνδέθηκα στη βιντεοκλήση στην ώρα μου αλλά η ψυχολόγος δεν εμφανίστηκε. Ζητώ επιστροφή χρημάτων." },
    });

    const eleniUser = await db.psychologistProfile.findUniqueOrThrow({ where: { id: eleni.id }, select: { userId: true } });
    const convo = await db.conversation.create({ data: { clientId: client.id, psychologistId: eleni.id } });
    const msgs: [string, string][] = [
      [client.id, "Καλησπέρα, θα ήθελα να ρωτήσω αν μπορούμε να δουλέψουμε και τις κρίσεις πανικού στην επόμενη συνεδρία."],
      [eleniUser.userId, "Καλησπέρα Άννα, φυσικά. Αν μπορείτε, σημειώστε πότε συμβαίνουν αυτή την εβδομάδα για να τις δούμε μαζί."],
    ];
    for (const [i, [senderId, body]] of msgs.entries()) {
      await db.message.create({
        data: { conversationId: convo.id, senderId, bodyEncrypted: encrypt(body), createdAt: new Date(Date.now() - (2 - i) * 3_600_000), readAt: new Date() },
      });
    }
    await db.conversation.update({ where: { id: convo.id }, data: { lastMessageAt: new Date(Date.now() - 3_600_000) } });
    await db.conversation.create({ data: { clientId: client.id, psychologistId: maria.id } });

    await db.savedPsychologist.createMany({
      data: ["eleni-papadopoulou", "alex-nikolaidis"].map((slug) => ({ userId: client.id, psychologistId: profiles.get(slug)!.id })),
      skipDuplicates: true,
    });
  }

  // ── Plans (configurable in /admin/plans) ──
  const basic = await db.plan.upsert({
    where: { slug: "basic" },
    create: { slug: "basic", name: { el: "Βασικό", en: "Basic" }, monthlyPriceCents: 0, commissionBps: 1500, features: ["video", "invoicing"], isDefault: true, sortOrder: 0 },
    update: {},
  });
  const pro = await db.plan.upsert({
    where: { slug: "pro" },
    create: { slug: "pro", name: { el: "Pro", en: "Pro" }, monthlyPriceCents: 3900, commissionBps: 0, features: ["video", "invoicing", "analytics", "calendar_sync", "featured"], sortOrder: 1 },
    update: {},
  });
  void basic;

  // Psychologist 1 (Eleni) is on Pro, with analytics history and receipts.
  const eleni = await db.psychologistProfile.findUniqueOrThrow({ where: { slug: "eleni-papadopoulou" }, select: { id: true } });
  await db.psychologistProfile.update({ where: { id: eleni.id }, data: { planId: pro.id, planStartedAt: new Date(), submittedAt: new Date() } });
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000);
    const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const views = 8 + ((i * 7) % 11) + (d.getUTCDay() === 1 ? 6 : 0);
    await db.profileStat.upsert({
      where: { psychologistId_date: { psychologistId: eleni.id, date } },
      create: { psychologistId: eleni.id, date, views, searchAppearances: views * 4, bookingStarts: Math.round(views / 4), bookings: i % 5 === 0 ? 1 : 0 },
      update: {},
    });
  }
  if ((await db.invoice.count({ where: { psychologistId: eleni.id } })) === 0) {
    const paid = await db.payment.findMany({
      where: { status: "paid", appointment: { psychologistId: eleni.id } },
      orderBy: { paidAt: "asc" },
      include: { appointment: { select: { id: true, client: { select: { name: true } } } } },
    });
    for (const [n, pay] of paid.entries()) {
      await db.invoice.create({
        data: {
          psychologistId: eleni.id, appointmentId: pay.appointment.id, number: n + 1, issueDate: pay.paidAt ?? new Date(),
          clientName: pay.appointment.client.name, netCents: pay.amountCents, totalCents: pay.amountCents, vatExemption: "7", status: "issued",
        },
      });
    }
  }

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
        kind: c.kind, slug: c.slug, status: "published", publishedAt: new Date(), authorId: admin.id,
        translations: { create: (["el", "en"] as const).map((locale) => ({ locale, title: c[locale].title, excerpt: c[locale].excerpt ?? null, body: c[locale].body })) },
      },
    });
  }

  // ── Feedback examples for moderation ──
  const fb = await db.appointment.findMany({ where: { clientId: client.id, status: "completed", feedback: null }, take: 1, select: { id: true, psychologistId: true } });
  for (const a of fb) {
    await db.feedback.create({ data: { appointmentId: a.id, clientId: client.id, psychologistId: a.psychologistId, rating: 5, comment: "Πολύ ζεστή και πρακτική προσέγγιση. Έφυγα με σαφή εργαλεία.", publicConsent: true } });
  }

  console.log("Seed complete. Accounts use SEED_PASSWORD from .env:");
  console.log(`  admin:        ${adminEmail}`);
  console.log("  client:       client@example.test");
  console.log("  psychologist: psychologist1@example.test (verified), applicant1@example.test (pending)");
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
