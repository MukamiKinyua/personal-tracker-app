import { beforeAll, describe, expect, it } from "vitest";

/**
 * The secret has to exist before `_core/env` is imported, because it reads
 * `process.env` once at module load. Hence the dynamic import below.
 */
process.env.JWT_SECRET = "a-test-secret-long-enough-to-pass";

type AuthModule = typeof import("./googleAuth");
let auth: AuthModule;

beforeAll(async () => {
  auth = await import("./googleAuth");
});

const user = {
  id: 42,
  openId: "google:1234567890",
  provider: "google" as const,
  subject: "1234567890",
  email: "person@example.com",
  name: "A Person",
  picture: null,
  role: "user" as const,
  createdAt: new Date(),
  lastSignedIn: new Date(),
};

describe("the session", () => {
  it("round-trips the account it was minted for", async () => {
    const token = await auth.createSessionToken(user);
    expect(await auth.readSessionToken(token)).toEqual({
      userId: 42,
      openId: "google:1234567890",
    });
  });

  it("refuses a tampered token rather than trusting it", async () => {
    const token = await auth.createSessionToken(user);
    const [header, payload, signature] = token.split(".");

    /*
     * Tampered in the middle of the signature, not at its end.
     *
     * An HMAC-SHA256 signature is 32 bytes — 256 bits — but the 43 base64url
     * characters that carry it hold 258. The final character therefore has
     * four bits nothing reads, so several different last characters decode to
     * exactly the same signature and "flipping the last character" sometimes
     * forges nothing at all. A middle character has no such slack.
     */
    const at = Math.floor(signature.length / 2);
    const original = signature[at];
    const swapped = original === "A" ? "B" : "A";
    const forged = `${header}.${payload}.${signature.slice(0, at)}${swapped}${signature.slice(at + 1)}`;

    expect(forged).not.toBe(token);
    expect(await auth.readSessionToken(forged)).toBeNull();
  });

  it("refuses a tampered payload", async () => {
    const token = await auth.createSessionToken(user);
    const [header, , signature] = token.split(".");

    // Someone editing the account id to read another person's journal.
    const claim = Buffer.from(
      JSON.stringify({ uid: 999, sub: "google:someone-else" })
    ).toString("base64url");

    expect(
      await auth.readSessionToken(`${header}.${claim}.${signature}`)
    ).toBeNull();
  });

  it("refuses a token signed with a different secret", async () => {
    const { SignJWT } = await import("jose");
    const attacker = new TextEncoder().encode("some-other-secret-entirely!!");
    const forged = await new SignJWT({ uid: 1 })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("google:someone-else")
      .setIssuedAt()
      .setExpirationTime("1d")
      .sign(attacker);

    // Anyone able to mint their own session could read anyone's journal.
    expect(await auth.readSessionToken(forged)).toBeNull();
  });

  it("refuses an expired token", async () => {
    const { SignJWT } = await import("jose");
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const stale = await new SignJWT({ uid: 42 })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("google:1234567890")
      .setIssuedAt(Math.floor(Date.now() / 1000) - 7200)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 3600)
      .sign(secret);

    expect(await auth.readSessionToken(stale)).toBeNull();
  });

  it("refuses a well-signed token that carries no account id", async () => {
    const { SignJWT } = await import("jose");
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const empty = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("google:1234567890")
      .setIssuedAt()
      .setExpirationTime("1d")
      .sign(secret);

    expect(await auth.readSessionToken(empty)).toBeNull();
  });

  it("treats nonsense as signed out rather than throwing", async () => {
    expect(await auth.readSessionToken("not-a-token")).toBeNull();
    expect(await auth.readSessionToken("")).toBeNull();
  });
});

describe("google configuration", () => {
  it("reports whether sign-in can work at all", () => {
    delete process.env.GOOGLE_CLIENT_ID;
    expect(auth.googleConfigured()).toBe(false);

    process.env.GOOGLE_CLIENT_ID = "example.apps.googleusercontent.com";
    expect(auth.googleConfigured()).toBe(true);
  });

  it("refuses to verify a token when no audience is configured", async () => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_ID_ANDROID;

    // Accepting any audience would take tokens minted for another app.
    await expect(auth.verifyGoogleIdToken("anything")).rejects.toThrow(
      /not configured/i
    );
  });

  it("rejects a token that is not signed by Google", async () => {
    process.env.GOOGLE_CLIENT_ID = "example.apps.googleusercontent.com";

    const { SignJWT } = await import("jose");
    const forged = await new SignJWT({
      email: "attacker@example.com",
      email_verified: true,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer("https://accounts.google.com")
      .setAudience("example.apps.googleusercontent.com")
      .setSubject("999")
      .setIssuedAt()
      .setExpirationTime("1d")
      .sign(new TextEncoder().encode("pretending-to-be-google-aaaaaaa"));

    // Correct claims are not enough; the signature must be Google's.
    await expect(auth.verifyGoogleIdToken(forged)).rejects.toThrow();
  });
});
