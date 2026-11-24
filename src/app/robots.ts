import type { MetadataRoute } from "next";
import { brand } from "@/config/brand";
import { demo } from "@/config/demo";

/** Private areas stay out of search results (they also require sign-in). */
export default function robots(): MetadataRoute.Robots {
  // Fictional psychologists must never look like real search results.
  if (demo.enabled) return { rules: [{ userAgent: "*", disallow: "/" }] };
  const base = brand.siteUrl.replace(/\/$/, "");
  const privateAreas = ["account", "dashboard", "admin", "session", "security", "sign-in", "sign-up"];
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", ...privateAreas.map((a) => `/*/${a}`)] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
