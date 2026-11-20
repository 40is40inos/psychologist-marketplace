import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // Next.js guard for server-only modules; harmless in tests.
      "server-only": path.resolve(__dirname, "tests/empty.ts"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    env: { DATA_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64") },
  },
});
