/**
 * The second step of signing in: challenge tokens, the attempt limiter, and
 * the one place that decides whether a code is good.
 *
 * Signing in with Google proves who someone is *to Google*. It is not a
 * session. The server answers it with a short-lived challenge, and only a
 * valid authenticator (or recovery) code turns the challenge into a session.
 * Until then nothing in the journal is reachable.
 */

import { hkdfSync } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";
import { TRPCError } from "@trpc/server";
import { ENV } from "./_core/env";
import {
  advanceTotpStep,
  consumeRecoveryCode,
  type StoredUser,
} from "./mongoUsers";
import {
  decryptSecret,
  hashRecoveryCode,
  looksLikeRecoveryCode,
  verifyTotp,
} from "./totp";

export const TWO_FACTOR_ISSUER = "Personal Tracker";
const CHALLENGE_TTL = "10m";

/**
 * Whether signing in demands a linked authenticator. On unless explicitly
 * switched off, which is for local development only. An account that has
 * already linked one is always challenged, whatever this says.
 */
export function twoFactorRequired(): boolean {
  return process.env.REQUIRE_TWO_FACTOR?.trim().toLowerCase() !== "false";
}

function rootSecret(): string {
  const secret = ENV.cookieSecret?.trim();
  if (!secret || secret.length < 16) {
    throw new Error(
      "JWT_SECRET must be set to at least 16 characters before sign-in can work."
    );
  }
  return secret;
}

/**
 * Separate keys for separate jobs, derived from the one configured secret. A
 * challenge token signed with its own key cannot be presented as a session
 * (which is signed with the root secret itself), and the key that encrypts
 * authenticator secrets is unrelated to both.
 */
function derivedKey(purpose: string): Buffer {
  return Buffer.from(
    hkdfSync(
      "sha256",
      rootSecret(),
      "personal-tracker",
      `two-factor:${purpose}`,
      32
    )
  );
}

export const encryptionKey = () => derivedKey("encrypt");

export type ChallengeClaims =
  | { purpose: "verify"; userId: number }
  | { purpose: "setup"; userId: number; secretEnc: string };

export async function signChallenge(claims: ChallengeClaims): Promise<string> {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(CHALLENGE_TTL)
    .sign(derivedKey("challenge"));
}

export async function readChallenge(
  token: string,
  purpose: ChallengeClaims["purpose"]
): Promise<ChallengeClaims> {
  try {
    const { payload } = await jwtVerify(token, derivedKey("challenge"));
    if (payload.purpose !== purpose || typeof payload.userId !== "number") {
      throw new Error("wrong purpose");
    }
    if (purpose === "setup" && typeof payload.secretEnc !== "string") {
      throw new Error("no secret");
    }
    return payload as unknown as ChallengeClaims;
  } catch {
    // One message for expired, forged and wrong-kind alike.
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "That sign-in step expired. Sign in with Google again.",
    });
  }
}

/* ------------------------------------------------------------------------ */
/* Attempt limiter                                                           */
/* ------------------------------------------------------------------------ */

const MAX_FAILURES = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

type Attempts = { failures: number; lockedUntil: number };
const attempts = new Map<number, Attempts>();

/**
 * Six digits is a million possibilities, so unlimited guessing would get
 * through. Kept in memory: a restart resets it, and one instance is the
 * documented deployment. Move it into MongoDB before running several.
 */
export function assertNotLocked(userId: number, now = Date.now()): void {
  const entry = attempts.get(userId);
  if (entry && entry.lockedUntil > now) {
    const minutes = Math.ceil((entry.lockedUntil - now) / 60_000);
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Too many wrong codes. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
    });
  }
}

export function recordFailure(userId: number, now = Date.now()): void {
  const entry = attempts.get(userId) ?? { failures: 0, lockedUntil: 0 };
  // A lockout that has run out starts the count again.
  const failures = entry.lockedUntil > 0 && entry.lockedUntil <= now ? 1 : entry.failures + 1;
  attempts.set(userId, {
    failures,
    lockedUntil: failures >= MAX_FAILURES ? now + LOCKOUT_MS : 0,
  });
}

export function clearFailures(userId: number): void {
  attempts.delete(userId);
}

export function resetLimiterForTests(): void {
  attempts.clear();
}

/* ------------------------------------------------------------------------ */
/* Checking a code                                                           */
/* ------------------------------------------------------------------------ */

/**
 * Accepts an authenticator code or a recovery code for an account that has an
 * authenticator linked. Counts failures, spends what it accepts, and returns
 * whether a recovery code was the thing used.
 */
export async function checkSecondFactor(
  user: StoredUser,
  code: string
): Promise<{ ok: true; usedRecoveryCode: boolean }> {
  assertNotLocked(user.id);

  const record = user.twoFactor;
  if (!record) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Two-step verification is not set up for this account.",
    });
  }

  if (looksLikeRecoveryCode(code)) {
    if (await consumeRecoveryCode(user.id, hashRecoveryCode(code))) {
      clearFailures(user.id);
      return { ok: true, usedRecoveryCode: true };
    }
  } else {
    const secret = decryptSecret(record.secretEnc, encryptionKey());
    const step = verifyTotp(secret, code, { lastStep: record.lastStep });
    // The step is claimed atomically: a code submitted twice at once only
    // works once.
    if (step !== null && (await advanceTotpStep(user.id, step))) {
      clearFailures(user.id);
      return { ok: true, usedRecoveryCode: false };
    }
  }

  recordFailure(user.id);
  throw new TRPCError({
    code: "UNAUTHORIZED",
    message: "That code didn't work. Check the latest code in your app.",
  });
}
