import { beforeAll, beforeEach, describe, expect, it } from "vitest";

// _core/env reads process.env once at import, so the secret is set first.
process.env.JWT_SECRET = "a-test-secret-long-enough-to-pass";

type TwoFactor = typeof import("./twoFactor");
type GoogleAuth = typeof import("./googleAuth");
let tf: TwoFactor;
let auth: GoogleAuth;

beforeAll(async () => {
  tf = await import("./twoFactor");
  auth = await import("./googleAuth");
}, 60_000);

beforeEach(() => {
  tf.resetLimiterForTests();
  delete process.env.REQUIRE_TWO_FACTOR;
});

const user = {
  id: 7,
  openId: "google:7",
  provider: "google" as const,
  subject: "7",
  email: "a@example.com",
  name: "A",
  picture: null,
  role: "user" as const,
  createdAt: new Date(),
  lastSignedIn: new Date(),
};

describe("challenge tokens", () => {
  it("round-trips for the step they were issued for", async () => {
    const token = await tf.signChallenge({ purpose: "verify", userId: 7 });
    expect(await tf.readChallenge(token, "verify")).toMatchObject({
      purpose: "verify",
      userId: 7,
    });
  });

  it("is refused for a different step, so a verify token cannot finish setup", async () => {
    const token = await tf.signChallenge({ purpose: "verify", userId: 7 });
    await expect(tf.readChallenge(token, "setup")).rejects.toThrow(/expired/);
  });

  it("carries the encrypted secret for setup and nothing readable", async () => {
    const token = await tf.signChallenge({
      purpose: "setup",
      userId: 7,
      secretEnc: "iv.tag.body",
    });
    const claims = await tf.readChallenge(token, "setup");
    expect(claims).toMatchObject({ secretEnc: "iv.tag.body" });
  });

  it("is never accepted as a session", async () => {
    const token = await tf.signChallenge({ purpose: "verify", userId: 7 });
    expect(await auth.readSessionToken(token)).toBeNull();
  });

  it("refuses a session token presented as a challenge", async () => {
    const session = await auth.createSessionToken(user);
    await expect(tf.readChallenge(session, "verify")).rejects.toThrow();
  });

  it("refuses a tampered token", async () => {
    const token = await tf.signChallenge({ purpose: "verify", userId: 7 });
    const [header, payload, signature] = token.split(".");
    const forged = Buffer.from(
      JSON.stringify({ purpose: "verify", userId: 8 })
    ).toString("base64url");
    await expect(
      tf.readChallenge(`${header}.${forged}.${signature}`, "verify")
    ).rejects.toThrow();
    expect(payload).toBeTruthy();
  });
});

describe("attempt limiter", () => {
  it("locks an account after five wrong codes, then recovers", () => {
    const now = 1_000_000;
    for (let i = 0; i < 4; i++) tf.recordFailure(7, now);
    expect(() => tf.assertNotLocked(7, now)).not.toThrow();
    tf.recordFailure(7, now);
    expect(() => tf.assertNotLocked(7, now + 1000)).toThrow(/Too many/);
    expect(() => tf.assertNotLocked(7, now + 16 * 60 * 1000)).not.toThrow();
  });

  it("counts each account on its own", () => {
    for (let i = 0; i < 5; i++) tf.recordFailure(7);
    expect(() => tf.assertNotLocked(8)).not.toThrow();
  });

  it("clears the count after a good code", () => {
    for (let i = 0; i < 4; i++) tf.recordFailure(7);
    tf.clearFailures(7);
    tf.recordFailure(7);
    expect(() => tf.assertNotLocked(7)).not.toThrow();
  });
});

describe("requirement switch", () => {
  it("is on by default and only off when explicitly disabled", () => {
    expect(tf.twoFactorRequired()).toBe(true);
    process.env.REQUIRE_TWO_FACTOR = "false";
    expect(tf.twoFactorRequired()).toBe(false);
    process.env.REQUIRE_TWO_FACTOR = "0";
    expect(tf.twoFactorRequired()).toBe(true);
  });
});
