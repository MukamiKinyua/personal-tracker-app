import { useEffect } from "react";
import { hasUnsavedWork, type SaveState } from "@/lib/core/saveState";

/**
 * Warns before the user leaves with work that exists only in memory.
 *
 * Requirement 2.4 asks for an explicit warning before leaving a page with
 * unsaved changes. Queued offline work deliberately does not trigger it —
 * that work is already durable locally, and warning about it would teach the
 * user to dismiss the warning that matters.
 */
export function useUnsavedWarning(state: SaveState): void {
  const atRisk = hasUnsavedWork(state);

  useEffect(() => {
    if (!atRisk) return;

    const warn = (event: BeforeUnloadEvent) => {
      // The browser shows its own wording; assigning returnValue is what
      // actually arms the prompt.
      event.preventDefault();
      event.returnValue = "";
      return "";
    };

    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [atRisk]);
}
