import { describe, expect, it } from "vitest";
import { generateSlots, type Rule } from "@/lib/availability";

// Monday 23 November 2026; Athens is UTC+2 in winter.
const monday8am = new Date("2026-11-23T06:00:00Z");
const morning: Rule = { weekday: 1, startMinute: 9 * 60, endMinute: 12 * 60, sessionTypes: [] };
const base = { rules: [morning], busy: [], type: "video" as const, durationMinutes: 50, bufferMinutes: 10, earliest: monday8am, days: 1 };
const iso = (d: Date[]) => d.map((x) => x.toISOString());

describe("generateSlots", () => {
  it("fills a window in local time on a duration + buffer grid", () => {
    expect(iso(generateSlots(base))).toEqual(["2026-11-23T07:00:00.000Z", "2026-11-23T08:00:00.000Z", "2026-11-23T09:00:00.000Z"]);
  });

  it("skips slots that clash with a booking, including the buffer after it", () => {
    const busy = [{ startsAt: new Date("2026-11-23T08:30:00Z"), endsAt: new Date("2026-11-23T09:20:00Z") }];
    expect(iso(generateSlots({ ...base, busy }))).toEqual(["2026-11-23T07:00:00.000Z"]);
  });

  it("respects the booking notice", () => {
    expect(iso(generateSlots({ ...base, earliest: new Date("2026-11-23T07:30:00Z") }))).toEqual(["2026-11-23T08:00:00.000Z", "2026-11-23T09:00:00.000Z"]);
  });

  it("keeps format-limited windows separate, but allows intro calls anywhere", () => {
    const rules: Rule[] = [{ ...morning, sessionTypes: ["video"] }];
    expect(generateSlots({ ...base, rules, type: "in_person" })).toHaveLength(0);
    expect(generateSlots({ ...base, rules, type: null, durationMinutes: 15 }).length).toBeGreaterThan(0);
  });

  it("adds one-off extra hours and stops at the limit", () => {
    const extra = [{ startsAt: new Date("2026-11-23T16:00:00Z"), endsAt: new Date("2026-11-23T18:00:00Z"), sessionTypes: [] }];
    const all = generateSlots({ ...base, extra });
    expect(all).toHaveLength(5);
    expect(iso(all).at(-1)).toBe("2026-11-23T17:00:00.000Z");
    expect(generateSlots({ ...base, limit: 2 })).toHaveLength(2);
  });

  it("returns nothing on days without hours", () => {
    expect(generateSlots({ ...base, earliest: new Date("2026-11-24T06:00:00Z") })).toHaveLength(0);
  });
});
