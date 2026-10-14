/**
 * Which origins may call the API with credentials.
 *
 * In the browser the app and API share an origin and none of this applies.
 * The Android build is served from inside the APK — `https://localhost` in
 * Capacitor's WebView — and calls a server elsewhere, which the browser treats
 * as cross-origin. That build's origins are always allowed; a hosted web copy
 * on a different domain is added through `CORS_ORIGINS`.
 *
 * Written by hand rather than pulling in the `cors` package: the whole policy
 * is one allowlist, and an exact-match list with credentials is the one shape
 * that is not easy to get wrong.
 */

import type { Express, Request, Response, NextFunction } from "express";

const ALWAYS = ["capacitor://localhost", "https://localhost", "http://localhost"];

export function allowedOrigins(env = process.env.CORS_ORIGINS ?? ""): Set<string> {
  const extra = env
    .split(",")
    .map(origin => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);
  return new Set([...ALWAYS, ...extra]);
}

export function corsMiddleware(origins: Set<string> = allowedOrigins()) {
  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;

    // Same-origin and non-browser callers send no Origin; nothing to do.
    if (typeof origin !== "string") return next();

    // An origin not on the list gets no CORS headers at all, so the browser
    // refuses the response. Wildcards are never used: with credentials they
    // would let any site act as the signed-in user.
    if (!origins.has(origin)) {
      return req.method === "OPTIONS" ? res.status(403).end() : next();
    }

    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-File-Name"
    );
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Max-Age", "86400");

    if (req.method === "OPTIONS") return res.status(204).end();
    return next();
  };
}

export function registerCors(app: Express) {
  app.use("/api", corsMiddleware());
}
