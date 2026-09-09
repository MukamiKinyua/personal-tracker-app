import { describe, expect, it } from "vitest";
import { classifyStaleWrite } from "./mongoRecords";

/**
 * Regression cover for a bug that silently lost data.
 *
 * The original check treated every write with a stale base revision as an
 * already-applied duplicate. That made the conflict branch unreachable: a
 * second device's edit was discarded, reported as "already applied", and the
 * client dropped it from its queue without ever telling anyone.
 */
describe("a write whose base revision is stale", () => {
  it("is a retry when the server already holds what it asked for", () => {
    expect(
      classifyStaleWrite(
        { body: { amountMl: 250 } },
        { body: { amountMl: 250 } }
      )
    ).toBe("duplicate");
  });

  it("is a conflict when the server holds something else", () => {
    // The edit that used to vanish.
    expect(
      classifyStaleWrite(
        { body: { amountMl: 250 } },
        { body: { amountMl: 999 } }
      )
    ).toBe("conflict");
  });

  it("notices a field only one side has", () => {
    expect(
      classifyStaleWrite(
        { body: { amountMl: 250 } },
        { body: { amountMl: 250, note: "after the run" } }
      )
    ).toBe("conflict");
  });

  it("treats a deletion as a real difference, not a retry", () => {
    expect(
      classifyStaleWrite(
        { body: { amountMl: 250 } },
        { body: { amountMl: 250 }, deletedAt: "2026-09-08T10:00:00.000Z" }
      )
    ).toBe("conflict");

    expect(
      classifyStaleWrite(
        { body: { amountMl: 250 }, deletedAt: "2026-09-08T10:00:00.000Z" },
        { body: { amountMl: 250 } }
      )
    ).toBe("conflict");
  });

  it("counts a replayed deletion as a retry", () => {
    expect(
      classifyStaleWrite(
        { body: { amountMl: 250 }, deletedAt: "2026-09-08T10:00:00.000Z" },
        { body: { amountMl: 250 }, deletedAt: "2026-09-08T11:00:00.000Z" }
      )
    ).toBe("duplicate");
  });
});
