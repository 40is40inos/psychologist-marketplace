import { describe, expect, it } from "vitest";
import { decrypt, encrypt } from "@/lib/crypto";
import { readValue, signValue } from "@/lib/auth/signed-value";
import { safeNextPath } from "@/lib/safe-redirect";
import { sniffMime } from "@/lib/file-type";

describe("encryption (AES-256-GCM)", () => {
  it("round-trips and uses a fresh IV each time", () => {
    const a = encrypt("Νιώθω άγχος");
    expect(decrypt(a)).toBe("Νιώθω άγχος");
    expect(encrypt("Νιώθω άγχος")).not.toBe(a);
  });

  it("rejects tampered ciphertext", () => {
    const [v, iv, tag, data] = encrypt("secret").split(".");
    const flipped = (data[0] === "A" ? "B" : "A") + data.slice(1);
    expect(() => decrypt([v, iv, tag, flipped].join("."))).toThrow();
  });
});

describe("signed values", () => {
  it("reads back only with the same purpose and before expiry", () => {
    const token = signValue("upload", { key: "x" }, 60_000);
    expect(readValue("upload", token)).toEqual({ key: "x" });
    expect(readValue("google-oauth", token)).toBeNull();
    expect(readValue("upload", signValue("upload", { key: "x" }, -1))).toBeNull();
  });

  it("rejects a modified payload", () => {
    const [, sig] = signValue("upload", { profileId: "a" }, 60_000).split(".");
    const forged = Buffer.from(JSON.stringify({ v: { profileId: "b" }, exp: Date.now() + 60_000 })).toString("base64url");
    expect(readValue("upload", `${forged}.${sig}`)).toBeNull();
  });
});

describe("safeNextPath (open redirects)", () => {
  it.each(["//evil.com", "https://evil.com", "/\\evil.com", 42])("blocks %s", (next) => {
    expect(safeNextPath(next, "el")).toBeNull();
  });
  it("keeps local paths and adds the locale", () => {
    expect(safeNextPath("/en/account", "el")).toBe("/en/account");
    expect(safeNextPath("/account", "el")).toBe("/el/account");
  });
});

describe("sniffMime", () => {
  it("detects real types from the first bytes", () => {
    expect(sniffMime(new TextEncoder().encode("%PDF-1.7"))).toBe("application/pdf");
    expect(sniffMime(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffMime(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
    expect(sniffMime(new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 "))).toBe("image/webp");
  });
  it("rejects anything else, e.g. HTML renamed to .pdf", () => {
    expect(sniffMime(new TextEncoder().encode("<html><script>"))).toBeNull();
  });
});
