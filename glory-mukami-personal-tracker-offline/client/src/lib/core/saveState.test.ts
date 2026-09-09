import { describe, expect, it } from "vitest";
import {
  hasUnsavedWork,
  initialSaveState,
  saveStateAnnouncement,
  saveStateMessage,
  saveStateReducer,
  type SaveEvent,
  type SaveState,
} from "./saveState";

function run(
  events: SaveEvent[],
  from: SaveState = initialSaveState
): SaveState {
  return events.reduce(saveStateReducer, from);
}

describe("save state machine", () => {
  it("moves from an edit through to saved", () => {
    const state = run([
      { type: "edited" },
      { type: "saveStarted" },
      { type: "saveSucceeded", at: "2026-03-14T09:00:00.000Z" },
    ]);
    expect(state.status).toBe("saved");
    expect(state.lastSavedAt).toBe("2026-03-14T09:00:00.000Z");
  });

  it("holds the edit and the reason when a save fails", () => {
    const state = run([
      { type: "edited" },
      { type: "saveStarted" },
      { type: "saveFailed", error: "the server did not respond" },
    ]);
    expect(state.status).toBe("failed");
    expect(saveStateMessage(state)).toBe(
      "Not saved — the server did not respond"
    );
  });

  it("warns before leaving only while work is genuinely at risk", () => {
    expect(hasUnsavedWork(run([{ type: "edited" }]))).toBe(true);
    expect(
      hasUnsavedWork(run([{ type: "edited" }, { type: "saveStarted" }]))
    ).toBe(true);
    expect(
      hasUnsavedWork(run([{ type: "saveFailed", error: "offline" }]))
    ).toBe(true);

    // Queued offline work is durable locally, so leaving loses nothing.
    expect(hasUnsavedWork(run([{ type: "queuedOffline", pending: 3 }]))).toBe(
      false
    );
    expect(
      hasUnsavedWork(
        run([{ type: "saveSucceeded", at: "2026-03-14T09:00:00.000Z" }])
      )
    ).toBe(false);
  });

  it("distinguishes a durable save from a device-only one in its wording", () => {
    const saved = run([
      { type: "saveSucceeded", at: "2026-03-14T09:00:00.000Z" },
    ]);
    const offline = run([{ type: "queuedOffline", pending: 2 }]);
    expect(saveStateMessage(saved)).toBe("Saved");
    expect(saveStateMessage(offline)).toBe(
      "Saved on this device — 2 changes will sync when you reconnect"
    );
    expect(
      saveStateMessage(run([{ type: "queuedOffline", pending: 1 }]))
    ).toContain("1 change will sync");
  });

  it("clears the queue count once everything has synced", () => {
    const state = run([
      { type: "queuedOffline", pending: 4 },
      { type: "queueDrained", at: "2026-03-14T10:00:00.000Z" },
    ]);
    expect(state).toMatchObject({ status: "saved", pending: 0 });
  });

  it("stays offline after a single save lands while others are still queued", () => {
    const state = run([
      { type: "queuedOffline", pending: 3 },
      { type: "saveSucceeded", at: "2026-03-14T10:00:00.000Z" },
    ]);
    expect(state.status).toBe("offline");
  });

  it("interrupts a screen reader only for a failure", () => {
    expect(
      saveStateAnnouncement(run([{ type: "saveFailed", error: "no network" }]))
        .assertive
    ).toBe(true);
    expect(
      saveStateAnnouncement(
        run([{ type: "saveSucceeded", at: "2026-03-14T09:00:00.000Z" }])
      ).assertive
    ).toBe(false);
  });
});
