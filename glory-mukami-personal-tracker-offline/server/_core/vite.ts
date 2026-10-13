import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";

/**
 * `import()` with a specifier esbuild cannot see, so it neither bundles the
 * module nor resolves it at build time — it stays a genuine runtime import.
 *
 * `vite.config.ts` and everything it pulls in (`vite`, the React and
 * Tailwind Vite plugins, ...) are devDependencies. A production install
 * skips those, so a specifier esbuild *can* see — even behind a dynamic
 * `import()` — gets bundled in and crashes the server before it ever reaches
 * this dev-only branch.
 */
function uncapturedImport<T>(specifier: string): Promise<T> {
  return new Function("s", "return import(s)")(specifier);
}

export async function setupVite(app: Express, server: Server) {
  const [{ createServer: createViteServer }, { default: viteConfig }] =
    await Promise.all([
      uncapturedImport<typeof import("vite")>("vite"),
      uncapturedImport<typeof import("../../vite.config")>(
        "../../vite.config"
      ),
    ]);

  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(
    express.static(distPath, {
      setHeaders(res, filePath) {
        // The worker and the shell must never be served stale: a cached
        // sw.js would keep every device on an old build until the browser's
        // own 24-hour check. Hashed assets are immutable and can be cached
        // for as long as anyone likes.
        if (/[\\/](sw\.js|index\.html|manifest\.webmanifest)$/.test(filePath)) {
          res.setHeader("Cache-Control", "no-cache");
        } else if (/[\\/]assets[\\/]/.test(filePath)) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      },
    })
  );

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
