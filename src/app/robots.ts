import type { MetadataRoute } from "next";
import { brand } from "@/config/brand";

/** Private areas stay out of search results (they also require sign-in). */
export default function robots(): MetadataRoute.Robots {
  const base = brand.siteUrl.replace(/\/$/, "");
  const privateAreas = ["account", "dashboard", "admin", "session", "security", "sign-in", "sign-up"];
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", ...privateAreas.map((a) => `/*/${a}`)] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
