import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { storagePut } from "../storage";
import {
  DOCUMENT_UPLOAD_MAX_BYTES,
  isSupportedDocumentMimeType,
  sanitizeDocumentFileName,
} from "../documentStorage";
import { sdk } from "./sdk";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  app.post(
    `/api/documents/upload`,
    express.raw({ type: "*/*", limit: `${DOCUMENT_UPLOAD_MAX_BYTES}b` }),
    async (req, res) => {
      let user;
      try {
        user = await sdk.authenticateRequest(req);
      } catch {
        return res.status(401).json({ error: "owner-authentication-required" });
      }
      try {
        if (user.isCron || !user.id)
          return res
            .status(403)
            .json({ error: "owner-authentication-required" });
        if (!Buffer.isBuffer(req.body) || req.body.length === 0)
          return res.status(400).json({ error: "file-body-required" });
        const contentType =
          typeof req.headers["content-type"] === "string"
            ? req.headers["content-type"].split(";")[0].toLowerCase()
            : "application/octet-stream";
        if (!isSupportedDocumentMimeType(contentType))
          return res.status(415).json({ error: "unsupported-document-type" });
        const rawName =
          typeof req.headers["x-file-name"] === "string"
            ? req.headers["x-file-name"]
            : "document";
        let decodedName = "document";
        try {
          decodedName = decodeURIComponent(rawName);
        } catch {
          decodedName = rawName;
        }
        const safeName = sanitizeDocumentFileName(decodedName);
        const stored = await storagePut(
          `journal-documents/${user.id}/${Date.now()}-${safeName}`,
          req.body,
          contentType
        );
        return res.json({
          key: stored.key,
          url: stored.url,
          originalName: safeName,
          mimeType: contentType,
          size: req.body.length,
          uploadedAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error("[Documents] Upload failed", error);
        return res.status(502).json({ error: "document-upload-failed" });
      }
    }
  );
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
