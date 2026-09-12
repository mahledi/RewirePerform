/**
 * Minimal production Service Worker registration.
 *
 * The SW is kept for installability, cache cleanup and push notifications, but
 * it no longer drives app updates from the client. That avoids Safari/iOS reload
 * loops and stale app-shell races.
 */

export async function registerSW() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  const nativeWindow = window as Window & {
    Capacitor?: { isNativePlatform?: () => boolean };
  };
  const isNativeShell = Boolean(nativeWindow.Capacitor?.isNativePlatform?.());
  if (isNativeShell) return;

  const isInIframe = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();

  const host = window.location.hostname;
  const isPreviewHost =
    host.includes("id-preview--") ||
    host.includes("lovableproject.com") ||
    host.includes("lovable.app");

  const isDev = import.meta.env.DEV;

  if (isDev || isInIframe || isPreviewHost) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    } catch {
      /* noop */
    }
    return;
  }

  // Kill-switch: ?sw=off entfernt eine bestehende SW-Registrierung sofort.
  if (window.location.search.includes("sw=off")) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((k) => caches.delete(k)));
    } catch {
      /* noop */
    }
    return;
  }

  try {
    await navigator.serviceWorker.register("/sw.js", {
      updateViaCache: "none",
    });
  } catch (err) {
    console.warn("[pwa] SW registration failed:", err);
  }
}
