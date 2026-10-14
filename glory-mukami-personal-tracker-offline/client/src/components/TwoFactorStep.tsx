/**
 * The authenticator step of signing in, shared by the login page and the
 * account panel in Settings.
 *
 * Three screens, driven entirely by `signIn.secondStep`:
 *  - setup: scan a QR code (or type the key) into an authenticator app, then
 *    prove it works with a code;
 *  - verify: enter the current code (or a recovery code);
 *  - recovery: the one-time recovery codes, shown once, before the journal
 *    opens.
 */

import type { SignInState } from "@/hooks/useGoogleSignIn";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

function useQrSvg(text: string | undefined) {
  const [svg, setSvg] = useState<string>();
  useEffect(() => {
    if (!text) return;
    let cancelled = false;
    QRCode.toString(text, { type: "svg", margin: 1, width: 192 })
      .then(markup => {
        if (!cancelled) setSvg(markup);
      })
      .catch(() => {
        if (!cancelled) setSvg(undefined);
      });
    return () => {
      cancelled = true;
    };
  }, [text]);
  return svg;
}

function CodeForm({
  signIn,
  label,
  hint,
  submitLabel,
}: {
  signIn: SignInState;
  label: string;
  hint?: string;
  submitLabel: string;
}) {
  const [code, setCode] = useState("");
  return (
    <form
      className="twofactor-form"
      onSubmit={event => {
        event.preventDefault();
        void signIn.submitCode(code.trim());
      }}
    >
      <label>
        <span>{label}</span>
        <input
          value={code}
          onChange={event => setCode(event.target.value)}
          autoComplete="one-time-code"
          autoFocus
          maxLength={16}
          placeholder="123 456"
          aria-describedby={hint ? "twofactor-hint" : undefined}
        />
      </label>
      {hint ? (
        <small id="twofactor-hint" className="twofactor-hint">
          {hint}
        </small>
      ) : null}
      <button type="submit" disabled={signIn.busy || code.trim().length < 6}>
        {signIn.busy ? "Checking…" : submitLabel}
      </button>
      {signIn.error ? (
        <p className="twofactor-error" role="alert">
          {signIn.error}
        </p>
      ) : null}
    </form>
  );
}

function SetupStep({
  signIn,
  step,
}: {
  signIn: SignInState;
  step: Extract<NonNullable<SignInState["secondStep"]>, { kind: "setup" }>;
}) {
  const svg = useQrSvg(step.otpauthUri);
  return (
    <div className="twofactor">
      <h2>Link your authenticator</h2>
      <p>
        Open Google Authenticator (or any authenticator app), add an account,
        and scan this code. You will need a code from it each time you sign in.
      </p>
      {svg ? (
        <div
          className="twofactor-qr"
          role="img"
          aria-label="QR code for your authenticator app"
          // Generated locally by the qrcode library from the server's own
          // otpauth link; nothing from the user or the network is in it.
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <div className="twofactor-qr twofactor-qr-empty" aria-hidden="true" />
      )}
      <details className="twofactor-manual">
        <summary>Can't scan? Enter the key instead</summary>
        <code>{step.secret.match(/.{1,4}/g)?.join(" ")}</code>
        <small>Type of key: time-based. Account: your Google email.</small>
      </details>
      <CodeForm
        signIn={signIn}
        label="Enter the 6-digit code from the app"
        submitLabel="Confirm and continue"
      />
      <button
        type="button"
        className="twofactor-back"
        onClick={signIn.cancelSecondStep}
      >
        Back
      </button>
    </div>
  );
}

function RecoveryStep({
  signIn,
  codes,
}: {
  signIn: SignInState;
  codes: string[];
}) {
  const [saved, setSaved] = useState(false);
  const text = codes.join("\n");

  function download() {
    const blob = new Blob(
      [`Personal Tracker recovery codes\nEach works once.\n\n${text}\n`],
      { type: "text/plain" }
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "personal-tracker-recovery-codes.txt";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="twofactor">
      <h2>Save your recovery codes</h2>
      <p>
        If you lose your phone, each of these signs you in once. They are shown
        only now, so keep them somewhere safe.
      </p>
      <ul className="twofactor-codes">
        {codes.map(code => (
          <li key={code}>{code}</li>
        ))}
      </ul>
      <div className="twofactor-actions">
        <button
          type="button"
          onClick={() => void navigator.clipboard?.writeText(text)}
        >
          Copy
        </button>
        <button type="button" onClick={download}>
          Download
        </button>
      </div>
      <label className="twofactor-saved">
        <input
          type="checkbox"
          checked={saved}
          onChange={event => setSaved(event.target.checked)}
        />
        <span>I have saved these codes</span>
      </label>
      <button
        type="button"
        className="twofactor-primary"
        disabled={!saved}
        onClick={() => void signIn.finish()}
      >
        Continue to my journal
      </button>
    </div>
  );
}

export function TwoFactorStep({ signIn }: { signIn: SignInState }) {
  const step = signIn.secondStep;
  if (!step) return null;

  if (step.kind === "setup") return <SetupStep signIn={signIn} step={step} />;
  if (step.kind === "recovery") {
    return <RecoveryStep signIn={signIn} codes={step.codes} />;
  }
  return (
    <div className="twofactor">
      <h2>Enter your code</h2>
      <p>Open your authenticator app and enter the current 6-digit code.</p>
      <CodeForm
        signIn={signIn}
        label="6-digit code"
        hint="Lost your phone? Enter one of your recovery codes instead."
        submitLabel="Verify and sign in"
      />
      <button
        type="button"
        className="twofactor-back"
        onClick={signIn.cancelSecondStep}
      >
        Back
      </button>
    </div>
  );
}
