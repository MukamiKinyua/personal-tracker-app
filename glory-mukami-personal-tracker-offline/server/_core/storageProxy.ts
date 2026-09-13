import fs from "fs";
import path from "path";
import type { Express } from "express";
import { ENV } from "./env";
import { sdk } from "./sdk";

const PRIVATE_DOCUMENT_PREFIX = "journal-documents/";

/**
 * Uploaded journal documents live under `journal-documents/<ownerId>/…`.
 * Everything else under /media/runtime is public artwork. A document is
 * served only to the signed-in account whose id is in its path; the random
 * hash in the file name makes a URL hard to guess, which is not the same as
 * private.
 */
export function privateDocumentOwnerId(key: string): number | null {
  if (!key.startsWith(PRIVATE_DOCUMENT_PREFIX)) return null;
  const segment = key.slice(PRIVATE_DOCUMENT_PREFIX.length).split("/")[0];
  const ownerId = Number(segment);
  return Number.isInteger(ownerId) && ownerId > 0 ? ownerId : Number.NaN;
}

export function registerStorageProxy(app: Express) {
  app.get("/media/runtime/*", async (req, res, next) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    const ownerId = privateDocumentOwnerId(key);
    if (ownerId !== null) {
      let user;
      try {
        user = await sdk.authenticateRequest(req);
      } catch {
        res.status(401).send("Sign in to open this document");
        return;
      }
      if (Number.isNaN(ownerId) || user.isCron || user.id !== ownerId) {
        res.status(403).send("This document belongs to another account");
        return;
      }
    }

    const candidatePaths = [
      path.resolve(process.cwd(), "client", "public", "media", "runtime", key),
      path.resolve(process.cwd(), "dist", "public", "media", "runtime", key),
      path.resolve(import.meta.dirname, "../..", "client", "public", "media", "runtime", key),
      path.resolve(import.meta.dirname, "../..", "dist", "public", "media", "runtime", key),
    ];

    for (const localPath of candidatePaths) {
      if (fs.existsSync(localPath) && fs.statSync(localPath).isFile()) {
        res.sendFile(localPath);
        return;
      }
    }

    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      next();
      return;
    }

    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/"
      );
      forgeUrl.searchParams.set("path", key);

      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      });

      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(
          `[StorageProxy] forge error: ${forgeResp.status} ${body}`
        );
        res.status(502).send("Storage backend error");
        return;
      }

      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }

      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
