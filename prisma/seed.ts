/**
 * Development seed: Greece, cities, one admin, one client, the demo
 * psychologists (verified), two pending applications, a few appointments
 * and one open dispute. Safe to run more than once.
 *
 *   npx prisma db seed
 *
 * Accounts use SEED_ADMIN_EMAIL and SEED_PASSWORD from .env. Never run
 * against production.
 */
import "dotenv/config";
import { randomBytes, scrypt } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { cities, demoTherapists } from "../src/data/demo-therapists";

if (process.env.NODE_ENV === "production") throw new Error("Refusing to seed in production");

const password = process.env.SEED_PASSWORD;
const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@example.test";
if (!password || password.length < 10) throw new Error("Set SEED_PASSWORD (10+ chars) in .env");

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

// Same format as src/lib/auth/password.ts (that file is server-only).
function hash(pw: string): Promise<string> {
  const N = 2 ** 15, r = 8, p = 1, salt = randomBytes(16);
  return new Promise((resolve, reject) =>
    scrypt(pw.normalize("NFKC"), salt, 64, { N, r, p, maxmem: 128 * N * r * 2 }, (err, key) =>
      err ? reject(err) : resolve(["scrypt", N, r, p, salt.toString("base64"), key.toString("base64")].join("$")),
    ),
  );
}

const titleMap: Record<string, "psychologist" | "psychotherapist" | "clinical_psychologist"> = {
  Psychologist: "psychologist",
  "Clinical psychologist": "clinical_psychologist",
  "Psychologist, psychotherapist": "psychotherapist",
};

async function main() {
  const passwordHash = await hash(password!);

  await db.country.upsert({
    where: { code: "GR" },
    create: { code: "GR", timeZone: "Europe/Athens", enabled: true },
    update: {},
  });
  for (const c of cities) {
    const city = await db.city.upsert({
      where: { countryCode_slug: { countryCode: "GR", slug: c.slug } },
      create: { countryCode: "GR", slug: c.slug },
      update: {},
    });
    for (const locale of ["el", "en"] as const) {
      await db.cityTranslation.upsert({
        where: { cityId_locale: { cityId: city.id, locale } },
        create: { cityId: city.id, locale, name: c.name[locale] },
        update: { name: c.name[locale] },
      });
    }
  }

  const user = (email: string, name: string, role: "client" | "psychologist" | "admin", locale: "el" | "en" = "el") =>
    db.user.upsert({
      where: { email },
      create: { email, name, role, locale, passwordHash, emailVerifiedAt: new Date() },
      update: { passwordHash, status: "active" },
    });

  const admin = await user(adminEmail, "Admin", "admin", "en");
  const client = await user("client@example.test", "Άννα Δημητρίου", "client");

  // Verified demo psychologists.
  const profiles: { id: string; priceCents: number; type: "in_person" | "video" | "phone" }[] = [];
  for (const [i, t] of demoTherapists.entries()) {
    const u = await user(`psychologist${i + 1}@example.test`, t.name.el, "psychologist");
    const profile = await db.psychologistProfile.upsert({
      where: { userId: u.id },
      create: {
        userId: u.id,
        slug: t.slug,
        countryCode: "GR",
        title: titleMap[t.title.en] ?? "psychologist",
        licenseNumber: `GR-${10000 + i * 137}`,
        licensingAuthority: "Περιφέρεια Αττικής",
        verificationStatus: "verified",
        verifiedAt: new Date(),
        verifiedById: admin.id,
        practisingSince: t.practisingSince,
        sessionLanguages: t.languages,
        published: true,
      },
      update: {},
    });
    for (const locale of ["el", "en"] as const) {
      await db.psychologistProfileTranslation.upsert({
        where: { psychologistId_locale: { psychologistId: profile.id, locale } },
        create: { psychologistId: profile.id, locale, headline: t.headline[locale], bio: t.headline[locale] },
        update: {},
      });
    }
    for (const o of t.offerings) {
      await db.sessionOffering.upsert({
        where: { psychologistId_type: { psychologistId: profile.id, type: o.type } },
        create: { psychologistId: profile.id, type: o.type, durationMinutes: o.durationMinutes, priceCents: o.priceCents },
        update: {},
      });
    }
    profiles.push({ id: profile.id, priceCents: t.offerings[0].priceCents, type: t.offerings[0].type });
  }

  // Pending applications for the admin verification queue.
  const applicants = [
    { email: "applicant1@example.test", name: "Κατερίνα Λαμπρίδου", license: "GR-48211", authority: "Περιφέρεια Κεντρικής Μακεδονίας" },
    { email: "applicant2@example.test", name: "Petros Antoniou", license: "GR-50973", authority: "Περιφέρεια Κρήτης" },
  ];
  for (const a of applicants) {
    const u = await user(a.email, a.name, "psychologist");
    await db.psychologistProfile.upsert({
      where: { userId: u.id },
      create: {
        userId: u.id,
        slug: a.email.split("@")[0],
        countryCode: "GR",
        title: "psychologist",
        licenseNumber: a.license,
        licensingAuthority: a.authority,
        sessionLanguages: ["el"],
      },
      update: {},
    });
  }

  // Appointments and a dispute for the demo client (only on first run).
  if ((await db.appointment.count({ where: { clientId: client.id } })) === 0) {
    const day = 24 * 60 * 60 * 1000;
    const at = (offsetDays: number, hourUtc: number) => {
      const d = new Date(Date.now() + offsetDays * day);
      d.setUTCHours(hourUtc, 0, 0, 0);
      return d;
    };
    const make = (p: (typeof profiles)[number], start: Date, status: "confirmed" | "completed" | "no_show") =>
      db.appointment.create({
        data: {
          clientId: client.id,
          psychologistId: p.id,
          sessionType: p.type,
          status,
          startsAt: start,
          endsAt: new Date(start.getTime() + 50 * 60 * 1000),
          priceCents: p.priceCents,
          locale: "el",
        },
      });

    await make(profiles[0], at(-21, 15), "completed");
    await make(profiles[0], at(-14, 15), "completed");
    const missed = await make(profiles[2], at(-5, 16), "no_show");
    await make(profiles[0], at(2, 15), "confirmed");
    await make(profiles[2], at(6, 9), "confirmed");

    await db.dispute.create({
      data: {
        appointmentId: missed.id,
        openedById: client.id,
        reason: "Συνδέθηκα στη βιντεοκλήση στην ώρα μου αλλά η ψυχολόγος δεν εμφανίστηκε. Ζητώ επιστροφή χρημάτων.",
      },
    });
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
