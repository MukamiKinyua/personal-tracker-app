import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const journalCss = readFileSync(new URL("./journal.css", import.meta.url), "utf8");

describe("Workout Studio scroll ownership", () => {
  it("keeps the desktop spread as the scroll owner and disables inner library overflow", () => {
    expect(journalCss).toMatch(
      /\.journal-stage \.journal-spread > \.spread-page:nth-child\(2\)[\s\S]*overflow-y:\s*auto/,
    );
    expect(journalCss).toMatch(
      /\.journal-stage\s+\.journal-spread\s*>\s*\.spread-page:nth-child\(2\)\.workout-library-page[\s\S]*height:\s*100%[\s\S]*overflow-y:\s*auto/,
    );
    expect(journalCss).toMatch(
      /\.journal-stage\[data-journal-view="workouts"\] \.workout-library-page[\s\S]*justify-content:\s*flex-start[\s\S]*align-items:\s*stretch/,
    );
    expect(journalCss).toMatch(
      /\.journal-stage\s+\.journal-spread\s*>\s*\.spread-page:nth-child\(2\)\.workout-library-page[\s\S]*overflow-x:\s*hidden[\s\S]*overflow-y:\s*auto[\s\S]*justify-content:\s*flex-start/,
    );
  });

  it("keeps mobile Workout Studio content in natural document flow", () => {
    expect(journalCss).toMatch(
      /@media \(max-width:\s*820px\)[\s\S]*\.workout-library-page[\s\S]*overflow:\s*visible/,
    );
  });
});
