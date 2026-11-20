/**
 * Production-safe setup: loads reference data only (no demo accounts).
 *   npm run db:setup
 * Then create the first admin with: npm run db:create-admin -- <email>
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { seedReference } from "./reference";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL }) });

seedReference(db)
  .then(async () => {
    console.log("Reference data is in place.");
    await db.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
