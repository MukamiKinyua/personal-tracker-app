import { describe, expect, it } from "vitest";
import { collectionNames } from "./mongoJournal";

describe("MongoDB journal collection model", () => {
  it("keeps durable state and factual events in separate named collections", () => {
    expect(collectionNames()).toEqual(["journal_states", "journal_events"]);
  });
});
