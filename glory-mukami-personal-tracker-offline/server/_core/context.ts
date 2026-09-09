import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { parse as parseCookies } from "cookie";
import { COOKIE_NAME } from "../../shared/const";
import type { User } from "../../drizzle/schema";
import { readSessionToken } from "../googleAuth";
import { getUserById, type StoredUser } from "../mongoUsers";
import { sdk } from "./sdk";

/**
 * Presents a Mongo-stored account in the shape the rest of the server already
 * expects, so a Google session and a Manus session are indistinguishable to
 * every procedure downstream.
 */
function asUser(stored: StoredUser): User {
  return {
    id: stored.id,
    openId: stored.openId,
    name: stored.name,
    email: stored.email,
    loginMethod: stored.provider,
    role: stored.role,
    createdAt: stored.createdAt,
    updatedAt: stored.lastSignedIn,
    lastSignedIn: stored.lastSignedIn,
  } as User;
}

/**
 * Resolves the signed-in account from this server's own session cookie.
 *
 * Kept separate from the Manus SDK path so the app can stand on its own — the
 * Android build has no Manus OAuth server to talk to, and an account it cannot
 * reach is an account that does not survive reinstalling the app.
 */
async function userFromSession(
  req: CreateExpressContextOptions["req"]
): Promise<User | null> {
  // Parsed from the header directly: no cookie-parser middleware is installed,
  // so `req.cookies` is always undefined and reading it would silently mean
  // nobody is ever signed in.
  const header = req.headers?.cookie;
  if (!header) return null;

  const raw = parseCookies(header)[COOKIE_NAME];
  if (!raw) return null;

  const claims = await readSessionToken(raw);
  if (!claims) return null;

  const stored = await getUserById(claims.userId);
  // A session naming an account that no longer exists is signed out, not an
  // error — this is the path a deleted account takes.
  if (!stored || stored.openId !== claims.openId) return null;

  return asUser(stored);
}

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  // This server's own session first: it is the one the Android build uses, it
  // needs no external service, and it is cheap to check.
  try {
    user = await userFromSession(opts.req);
  } catch {
    user = null;
  }

  if (!user) {
    try {
      user = await sdk.authenticateRequest(opts.req);
    } catch {
      // Authentication is optional for public procedures.
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
