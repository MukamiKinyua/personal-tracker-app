import { useEffect, useState } from "react";

/**
 * Whether animation should be suppressed.
 *
 * Requirement 2.7 asks the application to respect the reduced-motion
 * preference, and 3.1 requires the page-turn to have an alternative rather than
 * simply being unavailable. The setting has three states because the operating
 * system preference is a default the user may want to override in either
 * direction from within the journal.
 */
export type MotionPreference = "system" | "always" | "never";

const QUERY = "(prefers-reduced-motion: reduce)";

export function useReducedMotion(
  preference: MotionPreference = "system"
): boolean {
  const [systemPrefers, setSystemPrefers] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia(QUERY);
    const update = (event: MediaQueryListEvent) =>
      setSystemPrefers(event.matches);

    // The system setting can change while the journal is open.
    media.addEventListener("change", update);
    setSystemPrefers(media.matches);
    return () => media.removeEventListener("change", update);
  }, []);

  if (preference === "always") return true;
  if (preference === "never") return false;
  return systemPrefers;
}
