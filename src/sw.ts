/// <reference lib="webworker" />
/* eslint-disable @typescript-eslint/no-explicit-any */
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { registerRoute, NavigationRoute } from "workbox-routing";
import { NetworkFirst, CacheFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { clientsClaim, setCacheNameDetails } from "workbox-core";

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: any };

const CACHE_SUFFIX = "v2";
const OFFLINE_URL = "/offline.html";

setCacheNameDetails({
  prefix: "rewireperform",
  suffix: CACHE_SUFFIX,
});

clientsClaim();
cleanupOutdatedCaches();

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((cacheName) =>
            cacheName === "html" ||
            cacheName === "assets" ||
            cacheName.startsWith("workbox-") ||
            (cacheName.startsWith("rewireperform-") && !cacheName.endsWith(CACHE_SUFFIX))
          )
          .map((cacheName) => caches.delete(cacheName))
      )
    )
  );
});

const precacheManifest = (self.__WB_MANIFEST || []).filter((entry: { url?: string }) => {
  if (!entry?.url) return false;
  return !entry.url.endsWith("/index.html") && entry.url !== "index.html";
});

// Precache static build output only. The app shell HTML must stay network-first.
precacheAndRoute(precacheManifest);

// SPA navigations -> live network app shell; offline fallback is static and chunk-free.
registerRoute(
  new NavigationRoute(
    async (params) => {
      try {
        return await fetch(params.request, { cache: "no-store" });
      } catch {
        const offline = await caches.match(OFFLINE_URL);
        return offline ?? new Response("RewirePerform ist gerade offline.", {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
          status: 503,
        });
      }
    },
    { denylist: [/^\/~oauth/, /^\/api\//] }
  )
);

// Static app assets: prefer fresh network assets; fall back to cache/offline if needed.
registerRoute(
  ({ request }) => ["style", "script", "worker"].includes(request.destination),
  new NetworkFirst({
    cacheName: `rewireperform-assets-${CACHE_SUFFIX}`,
    networkTimeoutSeconds: 8,
  })
);

// Images: CacheFirst, capped
registerRoute(
  ({ request }) => request.destination === "image",
  new CacheFirst({
    cacheName: `rewireperform-images-${CACHE_SUFFIX}`,
    plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 })],
  })
);

// ---- Push notifications (kept from previous public/sw.js) ----
self.addEventListener("push", (event: PushEvent) => {
  let data: any = { title: "RewirePerform", body: "", url: "/" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    if (event.data) data.body = event.data.text();
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/app-icon.png",
      badge: "/app-icon.png",
      data: { url: data.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const targetUrl = new URL((event.notification.data as any)?.url || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clients) => {
      const appClient = clients.find((client) => "focus" in client) as WindowClient | undefined;
      if (appClient) {
        const navigatedClient = await appClient.navigate(targetUrl).catch(() => null);
        return (navigatedClient || appClient).focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
