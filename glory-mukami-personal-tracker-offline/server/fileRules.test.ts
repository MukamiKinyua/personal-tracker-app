import { describe, expect, it } from "vitest";
import {
  contentMatchesType,
  dispositionFor,
  fileQuotaBytes,
  isAllowedFileType,
  isValidFileId,
  safeDownloadName,
} from "./fileRules";

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
const webp = Buffer.concat([
  Buffer.from("RIFF"),
  Buffer.from([0, 0, 0, 0]),
  Buffer.from("WEBP"),
]);

describe("file ids", () => {
  it("accepts a uuid and refuses anything that could reach a path or query", () => {
    expect(isValidFileId("3f2b8c1e-9d4a-4e7b-8a52-1c0d6e5f7a91")).toBe(true);
    expect(isValidFileId("../../etc/passwd")).toBe(false);
    expect(isValidFileId("a/b")).toBe(false);
    expect(isValidFileId("short")).toBe(false);
    expect(isValidFileId({ $ne: "x" })).toBe(false);
    expect(isValidFileId(undefined)).toBe(false);
  });
});

describe("content checks", () => {
  it("accepts bytes that match the declared type", () => {
    expect(contentMatchesType("image/png", png)).toBe(true);
    expect(contentMatchesType("image/jpeg", jpeg)).toBe(true);
    expect(contentMatchesType("image/webp", webp)).toBe(true);
    expect(contentMatchesType("application/pdf", Buffer.from("%PDF-1.7\n..."))).toBe(true);
    expect(
      contentMatchesType(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        Buffer.from([0x50, 0x4b, 0x03, 0x04, 1, 2])
      )
    ).toBe(true);
  });

  it("refuses a script or page renamed as an image or document", () => {
    const script = Buffer.from("<script>alert(1)</script>");
    expect(contentMatchesType("image/png", script)).toBe(false);
    expect(contentMatchesType("image/jpeg", png)).toBe(false);
    expect(contentMatchesType("application/pdf", script)).toBe(false);
    expect(contentMatchesType("image/webp", Buffer.from("RIFF....WAVE"))).toBe(false);
  });

  it("is case-insensitive about the declared type", () => {
    expect(contentMatchesType("IMAGE/PNG", png)).toBe(true);
  });
});

describe("types and delivery", () => {
  it("allows documents and photos but not executable or markup types", () => {
    expect(isAllowedFileType("image/jpeg")).toBe(true);
    expect(isAllowedFileType("application/pdf")).toBe(true);
    expect(isAllowedFileType("text/html")).toBe(false);
    expect(isAllowedFileType("image/svg+xml")).toBe(false);
    expect(isAllowedFileType("application/javascript")).toBe(false);
  });

  it("shows only passive formats inline and downloads the rest", () => {
    expect(dispositionFor("image/png")).toBe("inline");
    expect(dispositionFor("application/pdf")).toBe("inline");
    expect(dispositionFor("text/plain")).toBe("attachment");
    expect(dispositionFor("application/octet-stream")).toBe("attachment");
  });

  it("makes a header-safe download name", () => {
    expect(safeDownloadName('a"b\r\nc.pdf')).toBe("a_b_c.pdf");
    expect(safeDownloadName("***")).toBe("_");
    expect(safeDownloadName("")).toBe("file");
  });
});

describe("quota", () => {
  it("defaults to 100 MB and honours a valid override", () => {
    expect(fileQuotaBytes(undefined)).toBe(100 * 1024 * 1024);
    expect(fileQuotaBytes("50")).toBe(50 * 1024 * 1024);
    expect(fileQuotaBytes("nonsense")).toBe(100 * 1024 * 1024);
    expect(fileQuotaBytes("-3")).toBe(100 * 1024 * 1024);
  });
});
