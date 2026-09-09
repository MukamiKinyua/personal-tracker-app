import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useEffect, useMemo, useRef } from "react";
import { useIsJournalGhost } from "./journalGhost";

type ScopeOptions<T extends Record<string, unknown>> = {
  scope: string;
  payload: T;
  hydrate: (payload: Partial<T>) => void;
  delay?: number;
};

/**
 * Gradually migrates an existing tracker’s page-local state without changing its
 * interaction model. It remains local when the owner is signed out or MongoDB
 * has not yet been configured; no credential or readiness detail is rendered.
 */
export function useMongoJournalScope<T extends Record<string, unknown>>({
  scope,
  payload,
  hydrate,
  delay = 500,
}: ScopeOptions<T>) {
  const auth = useAuth();
  // A ghost copy reads exactly like the real page - it has to, or the turning
  // leaf would show different data from the page it is standing in for - but it
  // never writes.
  const isGhost = useIsJournalGhost();
  const connection = trpc.journal.connection.useQuery(undefined, {
    retry: 1,
    retryDelay: 750,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });
  const enabled = auth.isAuthenticated && connection.data?.ready === true;
  const stateQuery = trpc.journal.state.get.useQuery(
    { scope },
    { enabled, retry: false, refetchOnWindowFocus: false }
  );
  const saveState = trpc.journal.state.upsert.useMutation({
    onError: error => {
      console.warn(`[Persistence] Could not save ${scope}; local fallback remains active.`, error);
    },
  });
  const hydratedOwner = useRef<number | null>(null);
  const hydratedLocalKey = useRef("");
  const payloadKey = useMemo(() => JSON.stringify(payload), [payload]);
  const localStorageKey = `glory-personal-tracker:${scope}:${auth.user?.id ?? "guest"}`;

  useEffect(() => {
    if (hydratedLocalKey.current === localStorageKey) return;
    hydratedLocalKey.current = localStorageKey;
    try {
      const raw = window.localStorage.getItem(localStorageKey);
      if (!raw) return;
      const stored = JSON.parse(raw) as unknown;
      if (stored && typeof stored === "object") hydrate(stored as Partial<T>);
    } catch {
      // A blocked or malformed browser-local store must not stop the tracker.
    }
  }, [hydrate, localStorageKey]);

  useEffect(() => {
    if (isGhost) return;
    const flushLocalState = () => {
      try {
        window.localStorage.setItem(localStorageKey, JSON.stringify(payload));
      } catch {
        // Browser storage remains an enhancement and may be unavailable.
      }
    };
    window.addEventListener("pagehide", flushLocalState);
    return () => window.removeEventListener("pagehide", flushLocalState);
  }, [isGhost, localStorageKey, payload, payloadKey]);

  useEffect(() => {
    if (
      !enabled ||
      !auth.user ||
      !stateQuery.isSuccess ||
      hydratedOwner.current === auth.user.id
    )
      return;
    if (stateQuery.data?.payload)
      hydrate(stateQuery.data.payload as Partial<T>);
    hydratedOwner.current = auth.user.id;
  }, [auth.user, enabled, hydrate, stateQuery.data, stateQuery.isSuccess]);

  useEffect(() => {
    if (isGhost) return;
    if (hydratedLocalKey.current !== localStorageKey) return;
    const timeout = window.setTimeout(() => {
      try {
        window.localStorage.setItem(localStorageKey, JSON.stringify(payload));
      } catch {
        // Browser storage is an enhancement; Mongo remains the durable path.
      }
      if (enabled && auth.user && hydratedOwner.current === auth.user.id) {
        saveState.mutate({ scope, payload });
      }
    }, delay);
    return () => window.clearTimeout(timeout);
  }, [
    auth.user,
    delay,
    enabled,
    isGhost,
    localStorageKey,
    payload,
    payloadKey,
    saveState,
    scope,
  ]);

  return {
    enabled,
    isHydrating: enabled && !stateQuery.isSuccess,
    isSaving: saveState.isPending,
    persistenceUnavailable:
      Boolean(connection.error) || Boolean(stateQuery.error) || Boolean(saveState.error),
  };
}
