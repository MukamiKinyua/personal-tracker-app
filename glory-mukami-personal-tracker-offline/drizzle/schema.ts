import {
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Durable, owner-scoped state for a named journal area. Payloads are intentionally
 * namespaced so the existing page-level local workflows can migrate safely in
 * small, tested groups instead of requiring one risky all-at-once rewrite.
 */
export const journalStates = mysqlTable(
  "journal_states",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    scope: varchar("scope", { length: 64 }).notNull(),
    payload: json("payload").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("journal_states_user_scope_unique").on(
      table.userId,
      table.scope
    ),
    index("journal_states_user_index").on(table.userId),
  ]
);

/**
 * Compact factual event rows for the journal-wide History, Analytics, Insights,
 * and Recommendations experiences. Metadata remains optional and user-scoped.
 */
export const journalEvents = mysqlTable(
  "journal_events",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    scope: varchar("scope", { length: 64 }).notNull(),
    kind: varchar("kind", { length: 64 }).notNull(),
    summary: varchar("summary", { length: 240 }).notNull(),
    metadata: json("metadata").$type<Record<string, unknown> | null>(),
    occurredAt: timestamp("occurredAt").defaultNow().notNull(),
  },
  table => [
    index("journal_events_user_occurred_index").on(
      table.userId,
      table.occurredAt
    ),
    index("journal_events_user_scope_index").on(table.userId, table.scope),
  ]
);

export type JournalState = typeof journalStates.$inferSelect;
export type JournalEvent = typeof journalEvents.$inferSelect;
