import { describe, expect, it } from "vitest";
import {
  DOCUMENT_UPLOAD_MAX_BYTES,
  isSupportedDocumentMimeType,
  sanitizeDocumentFileName,
} from "./documentStorage";

describe("document storage policy", () => {
  it("allows the supported document types and rejects executable types", () => {
    expect(isSupportedDocumentMimeType("application/pdf")).toBe(true);
    expect(isSupportedDocumentMimeType("IMAGE/PNG")).toBe(true);
    expect(isSupportedDocumentMimeType("application/javascript")).toBe(false);
  });

  it("sanitizes path-like or punctuation-heavy names", () => {
    expect(sanitizeDocumentFileName("../../passport scan (final).pdf")).toBe(
      "passport-scan-final-.pdf"
    );
    expect(sanitizeDocumentFileName("***")).toBe("document");
    expect(sanitizeDocumentFileName("a".repeat(200))).toHaveLength(120);
  });

  it("keeps the server-side upload boundary explicit", () => {
    expect(DOCUMENT_UPLOAD_MAX_BYTES).toBe(15 * 1024 * 1024);
  });
});

describe("private document ownership from the storage key", () => {
  it("names the owner for journal documents and nobody for public artwork", async () => {
    const { privateDocumentOwnerId } = await import("./_core/storageProxy");
    expect(privateDocumentOwnerId("journal-documents/42/1726-passport_ab12cd34.pdf")).toBe(42);
    expect(privateDocumentOwnerId("glory-art-cv-night-desk_c8bff2ca.jpg")).toBeNull();
    // A malformed owner segment must not fall through to "public".
    expect(Number.isNaN(privateDocumentOwnerId("journal-documents/not-a-user/x.pdf"))).toBe(true);
  });
});
