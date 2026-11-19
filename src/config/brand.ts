/**
 * Brand settings. The product name is still a placeholder: set
 * NEXT_PUBLIC_BRAND_NAME (or change the fallback) and every page,
 * translation and email picks it up.
 */
export const brand = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME ?? "BRAND NAME",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@example.com",
  /**
   * Name shown on card statements once card payments are enabled. Keep it
   * neutral: no "therapy", "psych" or similar. Card networks allow 5-22
   * characters (letters, digits, spaces).
   */
  statementDescriptor: (process.env.PAYMENT_STATEMENT_DESCRIPTOR ?? "BOOKING SERVICES").slice(0, 22),
} as const;
