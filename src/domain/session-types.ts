/**
 * The three ways a session can take place. Mirrors the SessionType enum in
 * prisma/schema.prisma. Labels live in the dictionaries under sessionTypes.
 */
export const SESSION_TYPES = ["in_person", "video", "phone"] as const;
export type SessionType = (typeof SESSION_TYPES)[number];

export function isSessionType(value: unknown): value is SessionType {
  return (
    typeof value === "string" &&
    (SESSION_TYPES as readonly string[]).includes(value)
  );
}

/** Remote formats don't need an office address and can be booked nationwide. */
export function isRemote(type: SessionType): boolean {
  return type !== "in_person";
}

/** One bookable offering on a therapist's profile. Prices are in cents. */
export interface SessionOffering {
  type: SessionType;
  durationMinutes: number;
  priceCents: number;
}
