/**
 * Signing in with Google.
 *
 * The account is what makes "delete the app, install it again, find your
 * journal" true. Everything the sync engine does hangs on having a stable
 * identity, and Google Sign-In is the one that survives reinstalling an APK
 * without asking anyone to remember another password.
 *
 * The browser and the Android build obtain the ID token differently — Google
 * Identity Services here, a native plugin there — so this hook takes the token
 * from whichever source and does the identical thing with it. The token is
 * only ever a claim; the server verifies it before believing anything.
 */

import { storeSessionToken } from "@/lib/api";
import { trpc } from "@/lib/trpc";
import { useCallback, useEffect, useRef, useState } from "react";

const GSI_SRC = "https://accounts.google.com/gsi/client";

type CredentialResponse = { credential?: string };

type GoogleAccounts = {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (response: CredentialResponse) => void;
      }) => void;
      prompt: () => void;
      renderButton: (
        parent: HTMLElement,
        options: Record<string, unknown>
      ) => void;
    };
  };
};

/**
 * `@types/google.maps` already owns the global `google`, so this reads the
 * Identity Services object off `window` through a cast rather than
 * redeclaring a global that another package legitimately defines.
 */
function gsi(): GoogleAccounts | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { google?: GoogleAccounts }).google;
}

/** Loads Google's script once, and only when a sign-in is actually attempted. */
function loadGsi(): Promise<GoogleAccounts> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Sign-in needs a browser."));
  }
  const ready = gsi();
  if (ready?.accounts?.id) return Promise.resolve(ready);

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GSI_SRC}"]`
    );

    const onReady = () => {
      const loaded = gsi();
      if (loaded?.accounts?.id) resolve(loaded);
      else reject(new Error("Google sign-in failed to load."));
    };

    if (existing) {
      existing.addEventListener("load", onReady, { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Google sign-in failed to load.")),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.src = GSI_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", onReady, { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error("Google sign-in failed to load.")),
      { once: true }
    );
    document.head.appendChild(script);
  });
}

export type SignInState = {
  /** True once the server says Google sign-in is configured. */
  available: boolean;
  busy: boolean;
  error?: string;
  /** Signs in with a token obtained elsewhere — the Android path. */
  signInWithToken: (idToken: string) => Promise<void>;
  /** Opens Google's own prompt. Browser only. */
  signIn: () => Promise<void>;
  /** Renders Google's button into an element, which some flows require. */
  renderButton: (element: HTMLElement | null) => void;
};

export function useGoogleSignIn(clientId?: string): SignInState {
  const utils = trpc.useUtils();
  const methods = trpc.auth.methods.useQuery(undefined, { retry: false });
  const signInMutation = trpc.auth.google.useMutation();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const initialised = useRef(false);

  const exchange = useCallback(
    async (idToken: string) => {
      setBusy(true);
      setError(undefined);
      try {
        const signedIn = await signInMutation.mutateAsync({ idToken });
        // Kept beside the cookie, for the build where cookies cannot be
        // relied on. Same token, same lifetime.
        storeSessionToken(signedIn.sessionToken);
        // The session is set; re-read who we are rather than assuming.
        await utils.auth.me.invalidate();
      } catch (caught) {
        const message =
          caught instanceof Error ? caught.message : "Could not sign in.";
        setError(message);
        throw caught;
      } finally {
        setBusy(false);
      }
    },
    [signInMutation, utils]
  );

  const resolvedClientId =
    clientId ?? (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined);

  const ensureInitialised = useCallback(async () => {
    if (!resolvedClientId) {
      throw new Error("Google sign-in is not configured for this build.");
    }
    const google = await loadGsi();

    if (!initialised.current) {
      google.accounts.id.initialize({
        client_id: resolvedClientId,
        callback: response => {
          if (response.credential) void exchange(response.credential);
          else setError("Google did not return a sign-in token.");
        },
      });
      initialised.current = true;
    }
    return google;
  }, [exchange, resolvedClientId]);

  const signIn = useCallback(async () => {
    setError(undefined);
    try {
      const google = await ensureInitialised();
      google.accounts.id.prompt();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not sign in.");
    }
  }, [ensureInitialised]);

  const renderButton = useCallback(
    (element: HTMLElement | null) => {
      if (!element) return;
      void ensureInitialised()
        .then(google =>
          google.accounts.id.renderButton(element, {
            theme: "outline",
            size: "large",
            text: "continue_with",
          })
        )
        .catch(caught =>
          setError(
            caught instanceof Error ? caught.message : "Could not sign in."
          )
        );
    },
    [ensureInitialised]
  );

  // Nothing is loaded until the server confirms sign-in can work at all, so a
  // build without credentials never reaches out to Google.
  useEffect(() => {
    if (!methods.data?.google) initialised.current = false;
  }, [methods.data?.google]);

  return {
    available: Boolean(methods.data?.google && resolvedClientId),
    busy,
    error,
    signInWithToken: exchange,
    signIn,
    renderButton,
  };
}
