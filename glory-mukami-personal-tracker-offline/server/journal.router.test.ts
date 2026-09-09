import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mongoMocks = vi.hoisted(() => ({
  mongoReadiness: vi.fn(),
}));

const mongoJournalMocks = vi.hoisted(() => ({
  getMongoJournalState: vi.fn(),
  upsertMongoJournalState: vi.fn(),
  listMongoJournalEvents: vi.fn(),
  recordMongoJournalEvent: vi.fn(),
}));

vi.mock("./mongo", () => ({
  mongoReadiness: mongoMocks.mongoReadiness,
}));

vi.mock("./mongoJournal", () => ({
  ...mongoJournalMocks,
}));

import { appRouter } from "./routers";

function authenticatedContext(): TrpcContext {
  return {
    user: {
      id: 42,
      openId: "journal-owner",
      email: "owner@example.com",
      name: "Owner",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("journal router", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reveals only non-sensitive MongoDB readiness", async () => {
    mongoMocks.mongoReadiness.mockResolvedValue({
      configured: true,
      supported: true,
      reachable: false,
    });
    const caller = appRouter.createCaller(authenticatedContext());
    const status = await caller.journal.connection();
    expect(status).toEqual({ ready: false, configured: true, supported: true });
  });

  it("uses the authenticated owner id for state reads and writes", async () => {
    mongoJournalMocks.getMongoJournalState.mockResolvedValue(null);
    mongoJournalMocks.upsertMongoJournalState.mockResolvedValue({
      ownerId: 42,
      scope: "journal-shell",
      payload: { privateMode: true },
    });
    const caller = appRouter.createCaller(authenticatedContext());

    await caller.journal.state.get({ scope: "journal-shell" });
    await caller.journal.state.upsert({
      scope: "journal-shell",
      payload: { privateMode: true },
    });

    expect(mongoJournalMocks.getMongoJournalState).toHaveBeenCalledWith(
      42,
      "journal-shell"
    );
    expect(mongoJournalMocks.upsertMongoJournalState).toHaveBeenCalledWith(
      42,
      "journal-shell",
      { privateMode: true }
    );
  });

  it("records only a factual, bounded event payload for the authenticated owner", async () => {
    mongoJournalMocks.recordMongoJournalEvent.mockResolvedValue({
      id: "event-id",
    });
    const caller = appRouter.createCaller(authenticatedContext());

    await caller.journal.events.record({
      scope: "activity",
      kind: "completed",
      summary: "Focus session completed",
      metadata: { minutes: 25 },
    });

    expect(mongoJournalMocks.recordMongoJournalEvent).toHaveBeenCalledWith(42, {
      scope: "activity",
      kind: "completed",
      summary: "Focus session completed",
      metadata: { minutes: 25 },
    });
  });
});
