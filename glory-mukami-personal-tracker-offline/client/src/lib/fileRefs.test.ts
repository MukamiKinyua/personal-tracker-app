import { describe, expect, it } from "vitest";
import {
  fileProblem,
  fitWithin,
  formatBytes,
  isPhotoType,
  resolveMimeType,
} from "./fileRefs";

describe("file validation", () => {
  it("accepts documents and photos", () => {
    expect(fileProblem({ name: "a.pdf", size: 1000, type: "application/pdf" })).toBeNull();
    expect(fileProblem({ name: "a.jpg", size: 1000, type: "image/jpeg" })).toBeNull();
  });

  it("recognises an Office file the browser reported without a type", () => {
    expect(resolveMimeType("budget.xlsx", "")).toContain("spreadsheetml");
    expect(resolveMimeType("letter.DOCX", "application/octet-stream")).toContain(
      "wordprocessingml"
    );
    expect(fileProblem({ name: "budget.xlsx", size: 5, type: "" })).toBeNull();
  });

  it("refuses empty, oversize and unsupported files with a reason", () => {
    expect(fileProblem({ name: "a.pdf", size: 0, type: "application/pdf" })).toMatch(/empty/);
    expect(
      fileProblem({ name: "a.pdf", size: 16 * 1024 * 1024, type: "application/pdf" })
    ).toMatch(/15 MB/);
    expect(fileProblem({ name: "x.exe", size: 5, type: "application/x-msdownload" })).toMatch(
      /not supported/
    );
    expect(fileProblem({ name: "x.html", size: 5, type: "text/html" })).toMatch(/not supported/);
  });
});

describe("photo sizing", () => {
  it("leaves a small photo alone and scales a large one by its longest edge", () => {
    expect(fitWithin(1200, 800)).toEqual({ width: 1200, height: 800 });
    expect(fitWithin(4096, 3072)).toEqual({ width: 2048, height: 1536 });
    expect(fitWithin(3000, 6000)).toEqual({ width: 1024, height: 2048 });
  });

  it("never returns a zero edge", () => {
    expect(fitWithin(100000, 1).height).toBeGreaterThanOrEqual(1);
  });

  it("knows which types are photos", () => {
    expect(isPhotoType("image/PNG")).toBe(true);
    expect(isPhotoType("application/pdf")).toBe(false);
  });
});

describe("formatBytes", () => {
  it("reads naturally", () => {
    expect(formatBytes(500)).toBe("500 B");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(3 * 1024 * 1024)).toBe("3.0 MB");
  });
});
