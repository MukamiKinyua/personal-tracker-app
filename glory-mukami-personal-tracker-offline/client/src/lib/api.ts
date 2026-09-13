/**
 * Where the API lives, and how a request proves who it is from.
 *
 * In the browser the app and its API share an origin, so a relative URL and
 * the session cookie are enough. The Android build is different on both
 * counts: it is served from inside the APK (`https://localhost`) and talks to
 * a server somewhere else, and Android WebViews are unreliable about sending
 * cookies to a different site. So the API base is configurable, and the
 * session is also carried as a bearer token that this module keeps.
 *
 * The token is the same JWT the cookie holds — it grants exactly what the
 * cookie does, for exactly as long. It lives in localStorage because that is
 * what survives the WebView being killed, which on a phone is routine.
 */

const RAW_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

/** The API origin with no trailing slash; empty means "same origin". */
export const API_BASE = RAW_BASE.replace(/\/+$/, "");

export function apiUrl(path: string): string {
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

const SESSION_KEY = "tracker-session";

export function readSessionToken(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function storeSessionToken(token: string): void {
  try {
    localStorage.setItem(SESSION_KEY, token);
  } catch {
    // Storage unavailable: the cookie path still works where cookies do.
  }
}

export function clearSessionToken(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // Nothing to clear.
  }
}

/** Headers that identify the caller, for fetches that bypass tRPC. */
export function authHeaders(): Record<string, string> {
  const token = readSessionToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
