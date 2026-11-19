import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Prerendering reads the database. BUILD_CPUS=1 avoids overloading the
  // single-connection local dev database; leave unset in CI/production.
  ...(process.env.BUILD_CPUS && { experimental: { cpus: Number(process.env.BUILD_CPUS) } }),
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
