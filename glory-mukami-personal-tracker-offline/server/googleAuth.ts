/**
 * Google Sign-In, verified server-side.
 *
 * The single rule this file exists to enforce: **the server decides who you
 * are, never the client.** A phone sends a Google ID token; the server checks
 * that token's signature against Google's own published keys before believing
 * a word of it. Accepting a client-supplied user id instead would let anyone
 * read anyone's journal by typing a different number — which, for a journal
 * holding cycle and mood data, is the worst failure this app could have.
 *
 * Chosen for the Android build because Google Sign-In is native there and
 * survives reinstalling the app, which is exactly the property the whole sync
 * design depends on.
 */

import { createRemoteJWKSet, jwtVerify, SignJWT } from "jose";
import { ENV } from "./_core/env";
import { findOrCreateUser, type StoredUser } from "./mongoUsers";

/**
 * Google's public keys, fetched and cached by `jose`.
 *
 * Created once at module load: it refreshes itself on a key rotation, and
 * rebuilding it per request would fetch the key set on every sign-in.
 */
const GOOGLE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs")
);

const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

export type GoogleIdentity = {
  subject: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
};

export function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID?.trim());
}

/**
 * Accepted audiences.
 *
 * Android and web receive tokens minted for different OAuth clients, so both
 * ids must be accepted — but only ones this server was configured with. An
 * empty or wildcard audience would accept tokens issued for somebody else's
 * app entirely, which is a full account takeover.
 */
function allowedAudiences(): string[] {
  return [process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_ID_ANDROID]
    .map(value => value?.trim())
    .filter((value): value is string => Boolean(value));
}

export async function verifyGoogleIdToken(
  idToken: string
): Promise<GoogleIdentity> {
  const audiences = allowedAudiences();
  if (audiences.length === 0) {
    throw new Error("Google sign-in is not configured on this server.");
  }

  // Verifies the signature, the issuer, the audience and the expiry. Any of
  // those failing throws, and a throw here must never fall through to a
  // successful sign-in.
  const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
    issuer: GOOGLE_ISSUERS,
    audience: audiences,
  });

  const subject = payload.sub;
  if (!subject) throw new Error("That sign-in token carried no account id.");

  return {
    subject,
    email: typeof payload.email === "string" ? payload.email : null,
    // Google sends this as a boolean or the string "true" depending on flow.
    emailVerified:
      payload.email_verified === true || payload.email_verified === "true",
    name: typeof payload.name === "string" ? payload.name : null,
    picture: typeof payload.picture === "string" ? payload.picture : null,
  };
}

export async function signInWithGoogle(idToken: string): Promise<StoredUser> {
  const identity = await verifyGoogleIdToken(idToken);

  return findOrCreateUser({
    provider: "google",
    subject: identity.subject,
    email: identity.email,
    name: identity.name,
    picture: identity.picture,
  });
}

const SESSION_TTL_DAYS = 90;

function sessionSecret(): Uint8Array {
  const secret = ENV.cookieSecret?.trim();
  if (!secret || secret.length < 16) {
    // Refused rather than defaulted: a guessable signing key means anyone can
    // mint a session for any account, which is worse than not starting.
    throw new Error(
      "JWT_SECRET must be set to at least 16 characters before sign-in can work."
    );
  }
  return new TextEncoder().encode(secret);
}

/** Mints the session this server will accept back. */
export async function createSessionToken(user: StoredUser): Promise<string> {
  return new SignJWT({ uid: user.id, provider: user.provider })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.openId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_DAYS}d`)
    .sign(sessionSecret());
}

export type SessionClaims = { userId: number; openId: string };

/**
 * Reads a session back. Returns null rather than throwing, because an expired
 * or malformed cookie is an ordinary signed-out state, not an error worth
 * showing anyone.
 */
export async function readSessionToken(
  token: string
): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, sessionSecret());
    const userId = payload.uid;
    if (typeof userId !== "number" || !payload.sub) return null;
    return { userId, openId: payload.sub };
  } catch {
    return null;
  }
}

export const SESSION_MAX_AGE_MS = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
