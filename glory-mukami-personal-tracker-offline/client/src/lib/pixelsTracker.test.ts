import { describe, expect, it } from "vitest";
import {
  countFilledPixels,
  pixelsCellKey,
  pixelsMonths,
  setPixelCell,
  updatePixelCell,
} from "./pixelsTracker";

describe("Pixels tracker helpers", () => {
  it("keeps the twelve month year-at-a-glance structure", () => {
    expect(pixelsMonths).toHaveLength(12);
    expect(pixelsCellKey(0, 1)).toBe("1-1");
    expect(pixelsCellKey(11, 31)).toBe("12-31");
  });

  it("fills a selected cell and clears it when the same status is selected again", () => {
    const filled = updatePixelCell({}, 6, 14, "#d94889");
    expect(filled).toEqual({ "7-14": "#d94889" });
    expect(countFilledPixels(filled)).toBe(1);
    expect(updatePixelCell(filled, 6, 14, "#d94889")).toEqual({});
  });

  it("replaces the status color for a recorded day", () => {
    const cells = updatePixelCell({ "2-9": "#2e7b80" }, 1, 9, "#e5aa34");
    expect(cells).toEqual({ "2-9": "#e5aa34" });
  });

  it("sets an automatic daily value without toggling an already-matched colour off", () => {
    expect(setPixelCell({ "8-14": "#4b79b8" }, 7, 14, "#4b79b8")).toEqual({
      "8-14": "#4b79b8",
    });
  });
});
