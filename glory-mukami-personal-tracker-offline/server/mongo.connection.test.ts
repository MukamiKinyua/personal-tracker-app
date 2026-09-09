import { describe, expect, it } from "vitest";
import { mongoClientOptions, mongoUriStatus, pingMongoDb } from "./mongo";

describe("MongoDB server connection", () => {
  it("uses bounded connection timeouts for unavailable databases", () => {
    expect(mongoClientOptions.serverSelectionTimeoutMS).toBe(3000);
    expect(mongoClientOptions.connectTimeoutMS).toBe(3000);
    expect(mongoClientOptions.socketTimeoutMS).toBe(3000);
  });

  it("recognises supported MongoDB URI schemes without exposing a URI", () => {
    expect(mongoUriStatus("mongodb://localhost:27017/journal")).toEqual({
      configured: true,
      supported: true,
    });
    expect(
      mongoUriStatus("mongodb+srv://user:secret@example.mongodb.net/journal")
    ).toEqual({ configured: true, supported: true });
    expect(mongoUriStatus("placeholder")).toEqual({
      configured: true,
      supported: false,
    });
    expect(mongoUriStatus("")).toEqual({ configured: false, supported: false });
  });

  const connectionStatus = mongoUriStatus();
  const connectionTest =
    process.env.RUN_MONGO_LIVE_TEST === "1" &&
    connectionStatus.configured &&
    connectionStatus.supported
      ? it
      : it.skip;

  connectionTest(
    "uses the configured server-only MongoDB URI for a lightweight ping",
    async () => {
      const result = await pingMongoDb();
      expect(result.ok).toBe(1);
    },
    15_000
  );
});
