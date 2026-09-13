import { describe, expect, it } from "vitest";
import { allowedOrigins, corsMiddleware } from "./_core/cors";

function run(origin: string | undefined, method = "GET") {
  const headers: Record<string, string> = {};
  let status = 200;
  let ended = false;
  let nextCalled = false;
  const req = { headers: origin ? { origin } : {}, method } as never;
  const res = {
    setHeader: (key: string, value: string) => {
      headers[key] = value;
    },
    status: (code: number) => {
      status = code;
      return res;
    },
    end: () => {
      ended = true;
    },
  } as never;
  corsMiddleware(allowedOrigins("https://tracker.example"))(req, res, () => {
    nextCalled = true;
  });
  return { headers, status, ended, nextCalled };
}

describe("cors", () => {
  it("always admits the APK's own origins", () => {
    expect(allowedOrigins("").has("https://localhost")).toBe(true);
    expect(allowedOrigins("").has("capacitor://localhost")).toBe(true);
  });

  it("adds configured origins, trimmed and without trailing slashes", () => {
    const set = allowedOrigins(" https://a.example/ , https://b.example ");
    expect(set.has("https://a.example")).toBe(true);
    expect(set.has("https://b.example")).toBe(true);
  });

  it("echoes an allowed origin exactly, never a wildcard", () => {
    const { headers, nextCalled } = run("https://tracker.example");
    expect(headers["Access-Control-Allow-Origin"]).toBe("https://tracker.example");
    expect(headers["Access-Control-Allow-Credentials"]).toBe("true");
    expect(nextCalled).toBe(true);
  });

  it("gives an unknown origin no CORS headers", () => {
    const { headers, nextCalled } = run("https://evil.example");
    expect(headers).toEqual({});
    expect(nextCalled).toBe(true);
  });

  it("refuses a preflight from an unknown origin", () => {
    const { status, ended, nextCalled } = run("https://evil.example", "OPTIONS");
    expect(status).toBe(403);
    expect(ended).toBe(true);
    expect(nextCalled).toBe(false);
  });

  it("answers an allowed preflight itself", () => {
    const { status, ended, headers } = run("https://localhost", "OPTIONS");
    expect(status).toBe(204);
    expect(ended).toBe(true);
    expect(headers["Access-Control-Allow-Headers"]).toContain("Authorization");
  });

  it("leaves same-origin requests untouched", () => {
    const { headers, nextCalled } = run(undefined);
    expect(headers).toEqual({});
    expect(nextCalled).toBe(true);
  });
});
