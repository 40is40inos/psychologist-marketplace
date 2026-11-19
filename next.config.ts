import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Onboarding uploads two documents of up to 10 MB each.
    serverActions: { bodySizeLimit: "21mb" },
    proxyClientMaxBodySize: "21mb",
    // Prerendering reads the database. BUILD_CPUS=1 avoids overloading the
    // single-connection local dev database; leave unset in CI/production.
    ...(process.env.BUILD_CPUS && { cpus: Number(process.env.BUILD_CPUS) }),
  },
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
