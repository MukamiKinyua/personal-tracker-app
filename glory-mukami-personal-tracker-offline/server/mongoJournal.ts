import type { Collection, Document } from "mongodb";
import { getMongoDb } from "./mongo";

export type MongoJournalPayload = Record<string, unknown>;

type MongoJournalState = {
  ownerId: number;
  scope: string;
  payload: MongoJournalPayload;
  createdAt: Date;
  updatedAt: Date;
};

type MongoJournalEvent = {
  ownerId: number;
  scope: string;
  kind: string;
  summary: string;
  metadata: MongoJournalPayload | null;
  occurredAt: Date;
};

const indexPromises = new Map<string, Promise<void>>();

async function collections() {
  const db = await getMongoDb();
  const states = db.collection<MongoJournalState>("journal_states");
  const events = db.collection<MongoJournalEvent>("journal_events");
  const key = db.databaseName;

  if (!indexPromises.has(key)) {
    indexPromises.set(
      key,
      Promise.all([
        states.createIndex(
          { ownerId: 1, scope: 1 },
          { unique: true, name: "owner_scope_unique" }
        ),
        states.createIndex(
          { ownerId: 1, updatedAt: -1 },
          { name: "owner_updated" }
        ),
        events.createIndex(
          { ownerId: 1, occurredAt: -1 },
          { name: "owner_occurred" }
        ),
        events.createIndex(
          { ownerId: 1, scope: 1, occurredAt: -1 },
          { name: "owner_scope_occurred" }
        ),
      ]).then(() => undefined)
    );
  }

  await indexPromises.get(key);
  return { states, events };
}

function stateResult(document: MongoJournalState | null) {
  if (!document) return null;
  return {
    ownerId: document.ownerId,
    scope: document.scope,
    payload: document.payload,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

function eventResult(document: MongoJournalEvent) {
  return {
    ownerId: document.ownerId,
    scope: document.scope,
    kind: document.kind,
    summary: document.summary,
    metadata: document.metadata,
    occurredAt: document.occurredAt,
  };
}

export async function getMongoJournalState(ownerId: number, scope: string) {
  const { states } = await collections();
  return stateResult(await states.findOne({ ownerId, scope }));
}

export async function upsertMongoJournalState(
  ownerId: number,
  scope: string,
  payload: MongoJournalPayload
) {
  const { states } = await collections();
  const now = new Date();
  await states.updateOne(
    { ownerId, scope },
    {
      $set: { payload, updatedAt: now },
      $setOnInsert: { ownerId, scope, createdAt: now },
    },
    { upsert: true }
  );
  return getMongoJournalState(ownerId, scope);
}

/**
 * Removes every page workspace and event for an owner. Account deletion must
 * call this as well as the records purge: the workspaces hold the cycle,
 * finance, wellbeing and reflection pages, which are the most sensitive data
 * the journal keeps.
 */
export async function purgeMongoJournalForOwner(
  ownerId: number
): Promise<{ states: number; events: number }> {
  const { states, events } = await collections();
  const [stateResult, eventResult] = await Promise.all([
    states.deleteMany({ ownerId }),
    events.deleteMany({ ownerId }),
  ]);
  return {
    states: stateResult.deletedCount ?? 0,
    events: eventResult.deletedCount ?? 0,
  };
}

export async function listMongoJournalEvents(
  ownerId: number,
  limit: number,
  scope?: string
) {
  const { events } = await collections();
  const filter: Document = scope ? { ownerId, scope } : { ownerId };
  const documents = await events
    .find(filter)
    .sort({ occurredAt: -1 })
    .limit(limit)
    .toArray();
  return documents.map(eventResult);
}

export async function recordMongoJournalEvent(
  ownerId: number,
  input: {
    scope: string;
    kind: string;
    summary: string;
    metadata?: MongoJournalPayload;
    occurredAt?: Date;
  }
) {
  const { events } = await collections();
  const result = await events.insertOne({
    ownerId,
    scope: input.scope,
    kind: input.kind,
    summary: input.summary,
    metadata: input.metadata ?? null,
    occurredAt: input.occurredAt ?? new Date(),
  });
  return { id: result.insertedId.toHexString() };
}

export function collectionNames() {
  return ["journal_states", "journal_events"] as const;
}
