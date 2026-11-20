import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" },
  // Migrations need a direct (non-pooled) connection. The app itself uses
  // DATABASE_URL, which in production should be the pooled URL.
  datasource: { url: process.env.DIRECT_URL || process.env.DATABASE_URL || "" },
});
