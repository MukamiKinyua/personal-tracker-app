/* eslint-disable no-restricted-globals */
/**
 * The service worker: what makes the app open with no network at all.
 *
 * The journal's data already lives in IndexedDB and syncs when it can; this
 * covers the other half — the app shell itself. Without it, an offline phone
 * shows the browser's error page and every promise about "offline-first" is
 * only true while the tab happens to be open.
 *
 * Strategy by request:
 *   - The build's own hashed assets: cache first. A hashed filename never
 *     changes its content, so a cached copy is always right.
 *   - Navigations: serve the cached shell. The app is a single page, so every
 *     route is the same HTML; the router takes it from there.
 *   - The API: network only. The record store handles being offline by
 *     queueing writes, and caching an API reply would show stale data as fresh.
 *   - Everything else (fonts, media): network, falling back to whatever was
 *     cached before.
 *
 * The precache placeholder below is filled at build time with the real asset list — Vite
 * hashes filenames, so the list cannot be written by hand.
 */

const VERSION = "__VERSION__";
const SHELL_CACHE = `shell-${VERSION}`;
const RUNTIME_CACHE = "runtime";
const PRECACHE = __PRECACHE__;

self.addEventListener("install", event => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(
          keys
            // Old shells go; the runtime cache is shared across versions.
            .filter(key => key.startsWith("shell-") && key !== SHELL_CACHE)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isApi(url) {
  return url.pathname.startsWith("/api/");
}

function isBuildAsset(url) {
  return url.origin === self.location.origin && url.pathname.startsWith("/assets/");
}

self.addEventListener("fetch", event => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (isApi(url)) return; // network only, untouched

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/index.html"))
    );
    return;
  }

  if (isBuildAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        cached =>
          cached ??
          fetch(request).then(response => {
            const copy = response.clone();
            caches.open(SHELL_CACHE).then(cache => cache.put(request, copy));
            return response;
          })
      )
    );
    return;
  }

  // Fonts, page artwork, exercise videos: fresh when possible, remembered
  // otherwise. Opaque cross-origin responses are cached as-is.
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok || response.type === "opaque") {
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then(cache => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
