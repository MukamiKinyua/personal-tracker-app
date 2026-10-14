import { describe, expect, it } from "vitest";
import {
  base32Decode,
  base32Encode,
  decryptSecret,
  encryptSecret,
  generateRecoveryCodes,
  generateSecret,
  hashRecoveryCode,
  looksLikeRecoveryCode,
  normalizeRecoveryCode,
  otpauthUri,
  totpAt,
  verifyTotp,
} from "./totp";

// RFC 6238 Appendix B, SHA-1, ASCII secret "12345678901234567890". The RFC
// lists 8-digit codes; the 6-digit ones are their last six digits.
const RFC_SECRET = base32Encode(Buffer.from("12345678901234567890"));

describe("totp", () => {
  it("matches the RFC 6238 test vectors", () => {
    const vectors: Array<[number, string]> = [
      [59, "287082"],
      [1111111109, "081804"],
      [1111111111, "050471"],
      [1234567890, "005924"],
      [2000000000, "279037"],
      [20000000000, "353130"],
    ];
    for (const [seconds, code] of vectors) {
      expect(totpAt(RFC_SECRET, seconds * 1000)).toBe(code);
    }
  });

  it("round-trips base32", () => {
    const secret = generateSecret();
    expect(secret).toMatch(/^[A-Z2-7]{32}$/);
    expect(base32Encode(base32Decode(secret))).toBe(secret);
    expect(() => base32Decode("not*base32")).toThrow();
  });

  it("accepts the current code and one step of clock drift", () => {
    const now = 1_700_000_000_000;
    const code = totpAt(RFC_SECRET, now);
    expect(verifyTotp(RFC_SECRET, code, { now })).not.toBeNull();
    expect(verifyTotp(RFC_SECRET, code, { now: now + 30_000 })).not.toBeNull();
    expect(verifyTotp(RFC_SECRET, code, { now: now + 120_000 })).toBeNull();
  });

  it("tolerates spaces and refuses anything that is not six digits", () => {
    const now = 1_700_000_000_000;
    const code = totpAt(RFC_SECRET, now);
    expect(
      verifyTotp(RFC_SECRET, `${code.slice(0, 3)} ${code.slice(3)}`, { now })
    ).not.toBeNull();
    expect(verifyTotp(RFC_SECRET, "12345", { now })).toBeNull();
    expect(verifyTotp(RFC_SECRET, "abcdef", { now })).toBeNull();
  });

  it("refuses a step that was already accepted, so a code cannot be replayed", () => {
    const now = 1_700_000_000_000;
    const code = totpAt(RFC_SECRET, now);
    const step = verifyTotp(RFC_SECRET, code, { now });
    expect(step).not.toBeNull();
    expect(verifyTotp(RFC_SECRET, code, { now, lastStep: step! })).toBeNull();
  });

  it("builds an otpauth link an authenticator app can import", () => {
    const uri = otpauthUri({
      secret: "ABCDEFGH",
      account: "glory@example.com",
      issuer: "Personal Tracker",
    });
    expect(uri).toMatch(/^otpauth:\/\/totp\/Personal%20Tracker:glory%40example\.com\?/);
    expect(uri).toContain("secret=ABCDEFGH");
    expect(uri).toContain("issuer=Personal+Tracker");
    expect(uri).toContain("digits=6");
    expect(uri).toContain("period=30");
  });
});

describe("recovery codes", () => {
  it("generates distinct, easy-to-read codes", () => {
    const codes = generateRecoveryCodes(10);
    expect(new Set(codes).size).toBe(10);
    for (const code of codes) {
      expect(code).toMatch(/^[2-9A-HJKMNP-Z]{5}-[2-9A-HJKMNP-Z]{5}$/);
      expect(looksLikeRecoveryCode(code)).toBe(true);
    }
  });

  it("matches however the code is typed, and stores only a hash", () => {
    const [code] = generateRecoveryCodes(1);
    expect(normalizeRecoveryCode(code.toLowerCase())).toBe(
      normalizeRecoveryCode(code)
    );
    expect(hashRecoveryCode(code.toLowerCase().replace("-", " "))).toBe(
      hashRecoveryCode(code)
    );
    expect(hashRecoveryCode(code)).not.toContain(normalizeRecoveryCode(code));
    expect(looksLikeRecoveryCode("123456")).toBe(false);
  });
});

describe("secrets at rest", () => {
  const key = Buffer.alloc(32, 7);

  it("round-trips and does not store the secret in the clear", () => {
    const secret = generateSecret();
    const stored = encryptSecret(secret, key);
    expect(stored).not.toContain(secret);
    expect(decryptSecret(stored, key)).toBe(secret);
  });

  it("refuses a wrong key or tampered data", () => {
    const stored = encryptSecret("SECRET", key);
    expect(() => decryptSecret(stored, Buffer.alloc(32, 8))).toThrow();
    const [iv, tag, body] = stored.split(".");
    const flipped = Buffer.from(body, "base64url");
    flipped[0] ^= 1;
    expect(() =>
      decryptSecret(`${iv}.${tag}.${flipped.toString("base64url")}`, key)
    ).toThrow();
  });
});
