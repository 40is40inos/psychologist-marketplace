/**
 * Roles and what each one may do. Mirrors the UserRole enum in Prisma.
 * Check permissions with `can()` rather than comparing roles directly, so
 * adding a role (e.g. support staff) is a change in one place.
 */
export const ROLES = ["client", "psychologist", "admin"] as const;
export type Role = (typeof ROLES)[number];

/** Roles a person can choose when signing up. Admins are created by seed/CLI only. */
export const SIGNUP_ROLES = ["client", "psychologist"] as const satisfies readonly Role[];
export type SignupRole = (typeof SIGNUP_ROLES)[number];

const PERMISSIONS = {
  client: [
    "appointments.book",
    "appointments.pay",
    "appointments.readOwn",
    "appointments.cancelOwn",
    "disputes.open",
  ],
  psychologist: [
    "profile.editOwn",
    "availability.editOwn",
    "pricing.editOwn",
    "clients.readOwn",
    "sessions.manageOwn",
    "disputes.open",
  ],
  admin: [
    "licenses.verify",
    "content.moderate",
    "users.manage",
    "disputes.resolve",
    "analytics.read",
  ],
} as const satisfies Record<Role, readonly string[]>;

export type Permission = (typeof PERMISSIONS)[Role][number];

export function can(role: Role, permission: Permission): boolean {
  return (PERMISSIONS[role] as readonly string[]).includes(permission);
}

/** Where each role lands after signing in. */
export function homePathFor(role: Role): string {
  return { client: "/account", psychologist: "/dashboard", admin: "/admin" }[role];
}

/** Path prefixes that need a signed-in user, and which role owns them. */
export const PROTECTED_AREAS: { prefix: string; role: Role }[] = [
  { prefix: "/account", role: "client" },
  { prefix: "/dashboard", role: "psychologist" },
  { prefix: "/admin", role: "admin" },
];
