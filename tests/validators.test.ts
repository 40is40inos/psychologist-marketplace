import { describe, expect, it } from "vitest";
import { isValidAfm, isValidIban } from "@/lib/validators";

describe("IBAN", () => {
  it("accepts a valid Greek IBAN with spaces", () => {
    expect(isValidIban("GR16 0110 1250 0000 0001 2300 695")).toBe(true);
  });
  it("rejects a wrong check digit or length", () => {
    expect(isValidIban("GR17 0110 1250 0000 0001 2300 695")).toBe(false);
    expect(isValidIban("GR16 0110 1250 0000 0001 2300 69")).toBe(false);
  });
});

describe("ΑΦΜ (Greek tax number)", () => {
  it("checks the check digit", () => {
    expect(isValidAfm("090000045")).toBe(true);
    expect(isValidAfm("090000046")).toBe(false);
    expect(isValidAfm("000000000")).toBe(false);
    expect(isValidAfm("12345")).toBe(false);
  });
});
