/// <reference lib="webworker" />
/* eslint-disable @typescript-eslint/no-explicit-any */

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: any };

const OFFLINE_URL = "/offline.html";

// Vite injects this at build time. We intentionally do not precache app assets:
// Safari/iOS can otherwise serve stale index/chunk combinations after deploys.
const ignoredPrecacheManifest = self.__WB_MANIFEST;
if (!Array.isArray(ignoredPrecacheManifest)) {
  // Keep the injected manifest reference visible to Workbox without caching it.
  console.warn("[pwa] Missing precache manifest.");
}

self.skipWaiting();

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((cacheNames) =>
        Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)))
      ),
    ])
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;

  event.respondWith(
    fetch(event.request).catch(async () => {
      const offline = await fetch(OFFLINE_URL, { cache: "no-store" }).catch(() => null);
      return offline ?? new Response("RewirePerform ist gerade offline.", {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
        status: 503,
      });
    })
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "CLEAR_APP_CACHE") {
    event.waitUntil(
      caches.keys().then((cacheNames) =>
        Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)))
      )
    );
  }
});

// ---- Push notifications (kept from previous public/sw.js) ----
self.addEventListener("push", (event: PushEvent) => {
  let data: any = { title: "Neue Nachricht", body: "", url: "/" };
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
