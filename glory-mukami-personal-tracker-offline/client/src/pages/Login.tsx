/**
 * The sign-in page.
 *
 * Shown on first launch when the server offers Google sign-in. It says plainly
 * what an account adds - a second copy of the journal and the same entries on
 * every device - and that the journal works without one, because this is an
 * offline-first app and nobody should be locked out of their own notes.
 */

import { useGoogleSignIn } from "@/hooks/useGoogleSignIn";
import { isNative } from "@/lib/native";
import { useEffect, useRef } from "react";

export function Login({ onContinueWithoutAccount }: { onContinueWithoutAccount: () => void }) {
  const signIn = useGoogleSignIn();
  const buttonHost = useRef<HTMLDivElement>(null);
  const native = isNative();

  // In a browser Google draws its own button; on the phone the plain button
  // below opens the native account picker instead.
  useEffect(() => {
    if (signIn.available && !native) signIn.renderButton(buttonHost.current);
    // renderButton changes identity with the client id only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signIn.available, native]);

  return (
    <main className="login-screen" aria-labelledby="login-title">
      <div className="login-card">
        <p className="login-kicker">personal tracker</p>
        <h1 id="login-title">
          Welcome <em>back.</em>
        </h1>
        <p className="login-lede">
          Sign in to keep a second copy of your journal on your account and see
          the same entries on your phone, laptop and tablet.
        </p>

        {native ? (
          <button
            type="button"
            className="login-google"
            onClick={() => void signIn.signIn()}
            disabled={signIn.busy}
          >
            {signIn.busy ? "Signing in…" : "Continue with Google"}
          </button>
        ) : (
          <div className="login-google-host" ref={buttonHost} />
        )}

        {signIn.error ? (
          <p className="login-error" role="alert">
            {signIn.error}
          </p>
        ) : null}

        <div className="login-divider" aria-hidden="true">
          <span>or</span>
        </div>

        <button
          type="button"
          className="login-skip"
          onClick={onContinueWithoutAccount}
        >
          Continue without an account
        </button>
        <p className="login-note">
          Your journal stays on this device. You can sign in later from
          Settings.
        </p>
      </div>
    </main>
  );
}
