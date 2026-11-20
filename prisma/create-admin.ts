/**
 * Creates (or promotes) the first admin account without a password:
 *   npm run db:create-admin -- admin@yourdomain.gr "Full Name"
 * The admin then signs in with an email link and must set up two-factor
 * authentication before reaching the admin area.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const [email, name = "Admin"] = process.argv.slice(2);
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('Usage: npm run db:create-admin -- <email> "<name>"');
  process.exit(1);
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL }) });

db.user
  .upsert({
    where: { email: email.toLowerCase() },
    create: { email: email.toLowerCase(), name, role: "admin", locale: "el", passwordHash: "!", emailVerifiedAt: new Date() },
    update: { role: "admin", status: "active" },
    select: { id: true },
  })
  .then(async () => {
    console.log("Admin account ready. Sign in with an email link, then set up two-factor authentication.");
    await db.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
