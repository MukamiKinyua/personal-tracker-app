/**
 * Time-based one-time passwords (RFC 6238), the codes Google Authenticator,
 * Authy, 1Password and friends all produce.
 *
 * Written against node:crypto rather than a package: the algorithm is a page
 * of code, it has published test vectors (see totp.test.ts), and a login
 * dependency is one more thing that can be compromised.
 *
 * Nothing here touches a database or the network, so it can be tested alone.
 */

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "node:crypto";

export const TOTP_STEP_SECONDS = 30;
export const TOTP_DIGITS = 6;

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(bytes: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(text: string): Buffer {
  const clean = text.toUpperCase().replace(/[\s=-]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const char of clean) {
    const index = BASE32.indexOf(char);
    if (index === -1) throw new Error("Not a valid base32 secret.");
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** 160 bits, the size RFC 4226 recommends, as the base32 apps expect. */
export function generateSecret(): string {
  return base32Encode(randomBytes(20));
}

/** HOTP (RFC 4226): HMAC-SHA1 of the counter, dynamically truncated. */
export function hotp(secret: Buffer, counter: number): string {
  const message = Buffer.alloc(8);
  message.writeUInt32BE(Math.floor(counter / 2 ** 32), 0);
  message.writeUInt32BE(counter >>> 0, 4);
  const digest = createHmac("sha1", secret).update(message).digest();
  const offset = digest[digest.length - 1] & 0xf;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    (digest[offset + 1] << 16) |
    (digest[offset + 2] << 8) |
    digest[offset + 3];
  return String(binary % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, "0");
}

export function stepAt(timeMs: number): number {
  return Math.floor(timeMs / 1000 / TOTP_STEP_SECONDS);
}

export function totpAt(secretBase32: string, timeMs: number): string {
  return hotp(base32Decode(secretBase32), stepAt(timeMs));
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * Checks a code and returns the time step it matched, or null.
 *
 * `window` allows for clock drift between phone and server (one step either
 * side is the usual allowance). `lastStep` is the newest step already
 * accepted for this account: anything at or before it is refused, so a code
 * that was shown over someone's shoulder or captured cannot be replayed
 * inside its validity window.
 */
export function verifyTotp(
  secretBase32: string,
  code: string,
  options: { now?: number; window?: number; lastStep?: number } = {}
): number | null {
  const { now = Date.now(), window = 1, lastStep } = options;
  const cleaned = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(cleaned)) return null;

  const secret = base32Decode(secretBase32);
  const current = stepAt(now);
  let matched: number | null = null;
  // Every candidate is compared, with no early exit, so how long a check takes
  // does not reveal which step was close.
  for (let offset = -window; offset <= window; offset++) {
    const step = current + offset;
    if (lastStep !== undefined && step <= lastStep) continue;
    if (safeEqual(hotp(secret, step), cleaned) && matched === null) {
      matched = step;
    }
  }
  return matched;
}

export function otpauthUri({
  secret,
  account,
  issuer,
}: {
  secret: string;
  account: string;
  issuer: string;
}): string {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`;
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: String(TOTP_DIGITS),
    period: String(TOTP_STEP_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

/* ------------------------------------------------------------------------ */
/* Recovery codes                                                            */
/* ------------------------------------------------------------------------ */

// No 0/O/1/I/L: these get read off a screen and typed by hand.
const RECOVERY_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function generateRecoveryCodes(count = 10): string[] {
  return Array.from({ length: count }, () => {
    const pick = () =>
      Array.from(
        { length: 5 },
        () => RECOVERY_ALPHABET[randomInt(RECOVERY_ALPHABET.length)]
      ).join("");
    return `${pick()}-${pick()}`;
  });
}

export function normalizeRecoveryCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function looksLikeRecoveryCode(code: string): boolean {
  return normalizeRecoveryCode(code).length === 10;
}

/**
 * Only a hash is stored. A recovery code is as good as a password, and the
 * database should not be able to read one back.
 */
export function hashRecoveryCode(code: string): string {
  return createHash("sha256").update(normalizeRecoveryCode(code)).digest("hex");
}

/* ------------------------------------------------------------------------ */
/* Secrets at rest                                                           */
/* ------------------------------------------------------------------------ */

/** AES-256-GCM, as `iv.tag.ciphertext` in base64url. */
export function encryptSecret(secret: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), body]
    .map(part => part.toString("base64url"))
    .join(".");
}

export function decryptSecret(stored: string, key: Buffer): string {
  const [iv, tag, body] = stored
    .split(".")
    .map(part => Buffer.from(part, "base64url"));
  if (!iv || !tag || !body) throw new Error("Unreadable two-step secret.");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(body), decipher.final()]).toString(
    "utf8"
  );
}
