import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  journalEvents,
  journalStates,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

type JournalPayload = Record<string, unknown>;

async function requireJournalDb() {
  const db = await getDb();
  if (!db) throw new Error("Journal storage is temporarily unavailable");
  return db;
}

export async function getJournalState(userId: number, scope: string) {
  const db = await requireJournalDb();
  const result = await db
    .select()
    .from(journalStates)
    .where(
      and(eq(journalStates.userId, userId), eq(journalStates.scope, scope))
    )
    .limit(1);
  return result[0] ?? null;
}

export async function upsertJournalState(
  userId: number,
  scope: string,
  payload: JournalPayload
) {
  const db = await requireJournalDb();
  await db
    .insert(journalStates)
    .values({ userId, scope, payload })
    .onDuplicateKeyUpdate({ set: { payload, updatedAt: new Date() } });
  return getJournalState(userId, scope);
}

export async function listJournalEvents(
  userId: number,
  limit: number,
  scope?: string
) {
  const db = await requireJournalDb();
  const filter = scope
    ? and(eq(journalEvents.userId, userId), eq(journalEvents.scope, scope))
    : eq(journalEvents.userId, userId);
  return db
    .select()
    .from(journalEvents)
    .where(filter)
    .orderBy(desc(journalEvents.occurredAt), desc(journalEvents.id))
    .limit(limit);
}

export async function recordJournalEvent(
  userId: number,
  input: {
    scope: string;
    kind: string;
    summary: string;
    metadata?: JournalPayload;
    occurredAt?: Date;
  }
) {
  const db = await requireJournalDb();
  const result = await db.insert(journalEvents).values({
    userId,
    scope: input.scope,
    kind: input.kind,
    summary: input.summary,
    metadata: input.metadata ?? null,
    occurredAt: input.occurredAt ?? new Date(),
  });
  return { id: Number(result[0].insertId) };
}
