import { beforeAll, describe, expect, it } from "vitest";

// Bucket mode is chosen from env at import time.
beforeAll(() => {
  Object.assign(process.env, {
    S3_BUCKET: "psy-test",
    S3_ENDPOINT: "https://account.eu.r2.cloudflarestorage.com",
    S3_REGION: "auto",
    S3_ACCESS_KEY_ID: "test-access-key",
    S3_SECRET_ACCESS_KEY: "test-secret-key",
  });
});

describe("bucket storage signing", () => {
  it("signs a short-lived PUT for one object and content type", async () => {
    const { presignUpload, directUploads } = await import("@/lib/storage");
    expect(directUploads).toBe(true);
    const url = new URL(await presignUpload("documents/abc123/0123456789abcdef0123456789abcdef.pdf", "application/pdf"));
    expect(url.origin + url.pathname).toBe("https://account.eu.r2.cloudflarestorage.com/psy-test/documents/abc123/0123456789abcdef0123456789abcdef.pdf");
    expect(url.searchParams.get("X-Amz-Expires")).toBe("600");
    expect(url.searchParams.get("X-Amz-SignedHeaders")).toContain("content-type");
    expect(url.searchParams.get("X-Amz-Signature")).toMatch(/^[a-f0-9]{64}$/);
  });

  it("signs downloads with the stored type and a safe file name", async () => {
    const { signedDownloadUrl } = await import("@/lib/storage");
    const url = new URL((await signedDownloadUrl("photos/abc123/0123456789abcdef0123456789abcdef.png", { seconds: 60, mimeType: "image/png", filename: 'x"; evil.png' }))!);
    expect(url.searchParams.get("X-Amz-Expires")).toBe("60");
    expect(url.searchParams.get("response-content-type")).toBe("image/png");
    expect(url.searchParams.get("response-content-disposition")).toBe('inline; filename="x__ evil.png"');
  });

  it("refuses keys that could escape the bucket path", async () => {
    const { presignUpload } = await import("@/lib/storage");
    await expect(presignUpload("../secrets/x.pdf", "application/pdf")).rejects.toThrow("Invalid storage key");
  });
});
