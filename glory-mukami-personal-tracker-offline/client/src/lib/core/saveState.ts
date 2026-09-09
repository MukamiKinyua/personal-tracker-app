/**
 * The saved-state machine every page shares.
 *
 * Requirement 2.4 asks the interface to say whether an entry is unsaved,
 * saving, saved, failed, or saved offline, and 2.6 forbids leaving the user to
 * infer success from an animation. One machine keeps that vocabulary identical
 * on every page instead of each tracker inventing its own boolean pair.
 */

export type SaveStatus =
  /** Nothing has been typed since the last save. */
  | "idle"
  /** Edited and not yet written. */
  | "dirty"
  /** A write is in flight. */
  | "saving"
  /** Durably stored. */
  | "saved"
  /** The write was rejected or errored; the edit is still held locally. */
  | "failed"
  /** Held in the offline queue, to be synchronised on reconnect. */
  | "offline";

export type SaveState = {
  status: SaveStatus;
  /** When the last successful durable save landed. */
  lastSavedAt?: string;
  /** Why the last attempt failed, phrased for the user (2.6). */
  error?: string;
  /** How many queued writes are waiting for connectivity. */
  pending: number;
};

export type SaveEvent =
  | { type: "edited" }
  | { type: "saveStarted" }
  | { type: "saveSucceeded"; at: string }
  | { type: "saveFailed"; error: string }
  | { type: "queuedOffline"; pending: number }
  | { type: "queueDrained"; at: string }
  | { type: "reset" };

export const initialSaveState: SaveState = { status: "idle", pending: 0 };

export function saveStateReducer(
  state: SaveState,
  event: SaveEvent
): SaveState {
  switch (event.type) {
    case "edited":
      // An edit during a flight still leaves work outstanding once it lands.
      return { ...state, status: "dirty", error: undefined };

    case "saveStarted":
      return { ...state, status: "saving", error: undefined };

    case "saveSucceeded":
      return {
        ...state,
        status: state.pending > 0 ? "offline" : "saved",
        lastSavedAt: event.at,
        error: undefined,
      };

    case "saveFailed":
      return { ...state, status: "failed", error: event.error };

    case "queuedOffline":
      return {
        ...state,
        status: "offline",
        pending: event.pending,
        error: undefined,
      };

    case "queueDrained":
      return {
        ...state,
        status: "saved",
        pending: 0,
        lastSavedAt: event.at,
        error: undefined,
      };

    case "reset":
      return initialSaveState;

    default:
      return state;
  }
}

/**
 * Whether leaving the page would lose work. 2.4 requires an explicit warning
 * before navigating away while this is true. A failed save counts: the edit
 * exists only in memory. A queued offline write does not — it is durable
 * locally and will sync.
 */
export function hasUnsavedWork(state: SaveState): boolean {
  return (
    state.status === "dirty" ||
    state.status === "saving" ||
    state.status === "failed"
  );
}

/**
 * The sentence shown beside the entry. Each status reads differently on
 * purpose: "Saved" and "Saved on this device" describe different guarantees
 * and 2.4 asks the user to be able to tell them apart.
 */
export function saveStateMessage(state: SaveState): string {
  switch (state.status) {
    case "idle":
      return state.lastSavedAt ? "All changes saved" : "Nothing to save yet";
    case "dirty":
      return "Unsaved changes";
    case "saving":
      return "Saving…";
    case "saved":
      return "Saved";
    case "failed":
      return state.error
        ? `Not saved — ${state.error}`
        : "Not saved. Your entry is still here; try again.";
    case "offline":
      return state.pending === 1
        ? "Saved on this device — 1 change will sync when you reconnect"
        : `Saved on this device — ${state.pending} changes will sync when you reconnect`;
    default:
      return "";
  }
}

/**
 * Politeness for the live region announcing the state. Only a failure should
 * interrupt a screen reader mid-sentence (2.7).
 */
export function saveStateAnnouncement(state: SaveState): {
  message: string;
  assertive: boolean;
} {
  return {
    message: saveStateMessage(state),
    assertive: state.status === "failed",
  };
}
