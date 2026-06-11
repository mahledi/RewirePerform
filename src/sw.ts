/// <reference lib="webworker" />
/* eslint-disable @typescript-eslint/no-explicit-any */
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from "workbox-precaching";
import { registerRoute, NavigationRoute } from "workbox-routing";
import { NetworkFirst, CacheFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { clientsClaim } from "workbox-core";

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: any };

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((cacheName) => cacheName === "html" || cacheName === "assets")
          .map((cacheName) => caches.delete(cacheName))
      )
    )
  );
});

// Precache the build output (HTML, JS, CSS, assets)
precacheAndRoute(self.__WB_MANIFEST || []);

// SPA navigations -> NetworkFirst with offline fallback to cached index.html
const navHandler = createHandlerBoundToURL("/index.html");
registerRoute(
  new NavigationRoute(
    async (params) => {
      try {
        return await fetch(params.request, { cache: "no-store" });
      } catch {
        return navHandler(params);
      }
    },
    { denylist: [/^\/~oauth/, /^\/api\//] }
  )
);

// Static app assets: prefer fresh network assets; fall back to cache/offline if needed.
registerRoute(
  ({ request }) => ["style", "script", "worker"].includes(request.destination),
  new NetworkFirst({
    cacheName: "assets",
    networkTimeoutSeconds: 8,
  })
);

// Images: CacheFirst, capped
registerRoute(
  ({ request }) => request.destination === "image",
  new CacheFirst({
    cacheName: "images",
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
