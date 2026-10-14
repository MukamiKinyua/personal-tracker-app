/**
 * The HTTP side of file backup: /api/files.
 *
 * Plain HTTP rather than tRPC because a file is a binary body, and tRPC would
 * mean base64-encoding every photo. Every route resolves the caller from this
 * server's own session first and refuses anyone it cannot identify; the
 * owner id always comes from that session, never from the request.
 */

import express, { type Express, type Request, type Response } from "express";
import { authenticateUser } from "./_core/context";
import {
  contentMatchesType,
  dispositionFor,
  fileQuotaBytes,
  FILE_MAX_BYTES,
  isAllowedFileType,
  isValidFileId,
  safeDownloadName,
} from "./fileRules";
import { sanitizeDocumentFileName } from "./documentStorage";
import {
  deleteFile,
  findFile,
  listFiles,
  openFileStream,
  saveFile,
  usedBytes,
} from "./mongoFiles";

async function callerId(req: Request, res: Response): Promise<number | null> {
  const user = await authenticateUser(req);
  if (!user?.id) {
    res.status(401).json({ error: "sign-in-required" });
    return null;
  }
  return user.id;
}

function mimeOf(req: Request): string {
  const header = req.headers["content-type"];
  return typeof header === "string"
    ? header.split(";")[0].trim().toLowerCase()
    : "application/octet-stream";
}

function nameOf(req: Request): string {
  const raw = req.headers["x-file-name"];
  if (typeof raw !== "string") return "file";
  try {
    return sanitizeDocumentFileName(decodeURIComponent(raw));
  } catch {
    return sanitizeDocumentFileName(raw);
  }
}

export function registerFileRoutes(app: Express) {
  app.get("/api/files", async (req, res) => {
    try {
      const ownerId = await callerId(req, res);
      if (ownerId === null) return;
      const [files, used] = await Promise.all([
        listFiles(ownerId),
        usedBytes(ownerId),
      ]);
      res.json({ files, usedBytes: used, quotaBytes: fileQuotaBytes() });
    } catch (error) {
      console.error("[Files] list failed", error);
      res.status(502).json({ error: "files-unavailable" });
    }
  });

  app.put(
    "/api/files/:id",
    // Parsed here, with the size limit, so an oversize body is cut off at the
    // limit instead of being read into memory first.
    express.raw({ type: () => true, limit: FILE_MAX_BYTES }),
    async (req, res) => {
      try {
        const ownerId = await callerId(req, res);
        if (ownerId === null) return;

        const id = req.params.id;
        if (!isValidFileId(id)) {
          return res.status(400).json({ error: "invalid-file-id" });
        }
        const mimeType = mimeOf(req);
        if (!isAllowedFileType(mimeType)) {
          return res.status(415).json({ error: "unsupported-file-type" });
        }
        if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
          return res.status(400).json({ error: "file-body-required" });
        }
        if (!contentMatchesType(mimeType, req.body)) {
          // The bytes are not what the declared type says they are.
          return res.status(415).json({ error: "file-content-mismatch" });
        }

        // A retry of a file that already arrived costs nothing and never
        // counts against the quota twice.
        const existing = await findFile(ownerId, id);
        if (existing) return res.json({ file: existing, created: false });

        if ((await usedBytes(ownerId)) + req.body.length > fileQuotaBytes()) {
          return res.status(413).json({ error: "storage-quota-exceeded" });
        }

        const { stored, created } = await saveFile(ownerId, {
          id,
          name: nameOf(req),
          mimeType,
          data: req.body,
        });
        return res.status(created ? 201 : 200).json({ file: stored, created });
      } catch (error) {
        console.error("[Files] upload failed", error);
        return res.status(502).json({ error: "file-upload-failed" });
      }
    }
  );

  app.get("/api/files/:id", async (req, res) => {
    try {
      const ownerId = await callerId(req, res);
      if (ownerId === null) return;
      if (!isValidFileId(req.params.id)) {
        return res.status(400).json({ error: "invalid-file-id" });
      }
      const opened = await openFileStream(ownerId, req.params.id);
      // Another account's file looks exactly like a missing one.
      if (!opened) return res.status(404).json({ error: "not-found" });

      const { meta, stream } = opened;
      res.setHeader("Content-Type", meta.mimeType);
      res.setHeader("Content-Length", String(meta.size));
      res.setHeader(
        "Content-Disposition",
        `${dispositionFor(meta.mimeType)}; filename="${safeDownloadName(meta.name)}"`
      );
      // Never sniffed into something executable, and a PDF or image opened
      // directly cannot run script or load anything else.
      res.setHeader("X-Content-Type-Options", "nosniff");
      // Chrome's built-in PDF viewer will not render under a sandbox policy,
      // so it applies to images only; a PDF is still served as a PDF with
      // sniffing off.
      if (meta.mimeType !== "application/pdf") {
        res.setHeader("Content-Security-Policy", "sandbox; default-src 'none'");
      }
      res.setHeader("Cache-Control", "private, max-age=3600");
      stream.on("error", () => res.destroy());
      stream.pipe(res);
    } catch (error) {
      console.error("[Files] download failed", error);
      if (!res.headersSent) res.status(502).json({ error: "file-unavailable" });
    }
  });

  app.delete("/api/files/:id", async (req, res) => {
    try {
      const ownerId = await callerId(req, res);
      if (ownerId === null) return;
      if (!isValidFileId(req.params.id)) {
        return res.status(400).json({ error: "invalid-file-id" });
      }
      const deleted = await deleteFile(ownerId, req.params.id);
      return res.json({ deleted });
    } catch (error) {
      console.error("[Files] delete failed", error);
      return res.status(502).json({ error: "file-delete-failed" });
    }
  });
}
