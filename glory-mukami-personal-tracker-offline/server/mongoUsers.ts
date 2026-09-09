/**
 * Accounts, stored in MongoDB.
 *
 * The journal already needs Mongo; making sign-in depend on a second database
 * would mean two things to host, back up and keep reachable before anyone can
 * log in. So the account lives beside the records it owns.
 *
 * The account is the thing that makes "delete the app, reinstall it, find your
 * journal" true. Everything else — the sync engine, the device registry, the
 * cursors — is meaningless without a stable identity to hang it on, which is
 * why the id here is durable and never derived from anything the client sends.
 */

import { getMongoDb } from "./mongo";

export type AuthProvider = "google" | "manus";

export type StoredUser = {
  /** Numeric surrogate key, kept for compatibility with the existing context. */
  id: number;
  /** `${provider}:${subject}` — unique per person per provider. */
  openId: string;
  provider: AuthProvider;
  /** The provider's own immutable id for this person. */
  subject: string;
  email: string | null;
  name: string | null;
  picture: string | null;
  role: "user" | "admin";
  createdAt: Date;
  lastSignedIn: Date;
};

type Counter = { key: string; value: number };

const indexPromises = new Map<string, Promise<void>>();

async function collections() {
  const db = await getMongoDb();
  const users = db.collection<StoredUser>("app_users");
  const counters = db.collection<Counter>("app_counters");
  const key = db.databaseName;

  if (!indexPromises.has(key)) {
    indexPromises.set(
      key,
      Promise.all([
        users.createIndex(
          { openId: 1 },
          { unique: true, name: "open_id_unique" }
        ),
        users.createIndex({ id: 1 }, { unique: true, name: "user_id_unique" }),
        counters.createIndex(
          { key: 1 },
          { unique: true, name: "counter_key_unique" }
        ),
      ]).then(() => undefined)
    );
  }

  await indexPromises.get(key);
  return { users, counters };
}

/**
 * Finds the account for a verified identity, creating it on first sign-in.
 *
 * The caller must have *verified* the subject against the provider before
 * calling this. Nothing here checks a signature, so passing an unverified
 * subject would let anyone claim any account.
 */
export async function findOrCreateUser({
  provider,
  subject,
  email,
  name,
  picture,
}: {
  provider: AuthProvider;
  subject: string;
  email?: string | null;
  name?: string | null;
  picture?: string | null;
}): Promise<StoredUser> {
  const { users, counters } = await collections();
  const openId = `${provider}:${subject}`;
  const now = new Date();

  const existing = await users.findOne({ openId });
  if (existing) {
    // Profile details can change upstream; the id and openId never do.
    await users.updateOne(
      { openId },
      {
        $set: {
          lastSignedIn: now,
          email: email ?? existing.email,
          name: name ?? existing.name,
          picture: picture ?? existing.picture,
        },
      }
    );
    return { ...existing, lastSignedIn: now };
  }

  // Reserved atomically so two devices signing in at once cannot collide.
  const counter = await counters.findOneAndUpdate(
    { key: "users" },
    { $inc: { value: 1 } },
    { upsert: true, returnDocument: "after" }
  );

  const user: StoredUser = {
    id: counter?.value ?? 1,
    openId,
    provider,
    subject,
    email: email ?? null,
    name: name ?? null,
    picture: picture ?? null,
    role: "user",
    createdAt: now,
    lastSignedIn: now,
  };

  try {
    await users.insertOne(user);
    return user;
  } catch {
    // Lost a race with another concurrent first sign-in; theirs is the record.
    const winner = await users.findOne({ openId });
    if (winner) return winner;
    throw new Error("Could not create the account");
  }
}

export async function getUserById(id: number): Promise<StoredUser | null> {
  const { users } = await collections();
  return users.findOne({ id });
}

/** Removes the account itself. Records are purged separately, by owner id. */
export async function deleteUser(id: number): Promise<boolean> {
  const { users } = await collections();
  const result = await users.deleteOne({ id });
  return result.deletedCount === 1;
}
