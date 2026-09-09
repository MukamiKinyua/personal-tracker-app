import { describe, expect, it } from "vitest";
import { digitalSummary, type DigitalEntry } from "./digitalTracker";

describe("digital activity helpers", () => {
  it("summarises local daily and weekly time with the most logged category", () => {
    const entries: DigitalEntry[] = [
      {
        id: "1",
        date: "2026-08-25",
        minutes: 30,
        category: "Study",
        purpose: "Intentional",
        note: "",
      },
      {
        id: "2",
        date: "2026-08-23",
        minutes: 45,
        category: "Study",
        purpose: "Intentional",
        note: "",
      },
      {
        id: "3",
        date: "2026-08-20",
        minutes: 20,
        category: "Social",
        purpose: "Connection",
        note: "",
      },
      {
        id: "4",
        date: "2026-08-18",
        minutes: 60,
        category: "Entertainment",
        purpose: "Rest",
        note: "",
      },
    ];
    expect(digitalSummary(entries, "2026-08-25")).toEqual({
      todayMinutes: 30,
      weekMinutes: 95,
      topCategory: "Study",
    });
  });
});
