/**
 * Demo mode (DEMO_MODE=true): a public showcase with fictional data.
 * - A banner says the data is fictional; visitors can sign in with one click
 *   as a demo client, psychologist or admin (no passwords, no emails).
 * - Demo accounts can't be locked: password, email, 2FA, device and
 *   deletion changes are refused for them.
 * - Search engines are asked not to index anything.
 * Never enable it on a site with real users: one click gives admin access.
 */
export const demo = {
  enabled: process.env.DEMO_MODE === "true",
  /** Optional link to the source code, shown on the demo guide. */
  sourceUrl: process.env.DEMO_SOURCE_URL || null,
} as const;

export const DEMO_ROLES = ["client", "psychologist", "admin"] as const;
export type DemoRole = (typeof DEMO_ROLES)[number];

/** The seeded accounts behind the one-click sign-in (see prisma/seed.ts). */
export const DEMO_ACCOUNTS: Record<DemoRole, string> = {
  client: "client@example.test",
  psychologist: "psychologist1@example.test",
  admin: process.env.SEED_ADMIN_EMAIL || "admin@example.test",
};

/**
 * Only reserved test addresses (*.test) count as demo accounts, so a real
 * address can never get one-click access, even by misconfiguration.
 */
export function isDemoAccount(email: string): boolean {
  return demo.enabled && /@[a-z0-9.-]+\.test$/i.test(email);
}
