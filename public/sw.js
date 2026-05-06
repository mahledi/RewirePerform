// Legacy SW path – superseded by Workbox SW at /sw.js (built by vite-plugin-pwa).
// This stub exists only to clean up old registrations on devices that fetched
// the previous public/sw.js before the PWA migration.
self.addEventListener("install", (e) => e.waitUntil(self.skipWaiting()));
self.addEventListener("activate", (e) =>
  e.waitUntil(
    (async () => {
      await self.clients.claim();
      // Note: do NOT delete caches here — the new Workbox SW (also at /sw.js)
      // will take over after the next deploy. This file is kept only as a
      // safety net during the rollover.
    })()
  )
);
