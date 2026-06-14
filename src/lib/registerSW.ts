/**
 * Service-Worker-Registrierung mit harten Guards:
 * - Niemals in Dev (import.meta.env.DEV)
 * - Niemals in einem iframe (Lovable-Preview)
 * - Niemals auf Lovable-Preview-Hostnamen
 *
 * Produktion: Safari/iOS-sicherer Update-Flow.
 * sw.js wird mit updateViaCache: "none" registriert, Updates werden bei
 * Fokus/Sichtbarkeit geprüft, aber erst per SKIP_WAITING-Message aktiviert.
 */
type UpdateApplyFn = () => void;

declare global {
  interface WindowEventMap {
    "rewireperform:update-available": CustomEvent<{ applyUpdate: UpdateApplyFn }>;
  }
}

const dispatchUpdateAvailable = (registration: ServiceWorkerRegistration) => {
  const waiting = registration.waiting;
  if (!waiting) return;

  const applyUpdate = () => {
    waiting.postMessage({ type: "SKIP_WAITING" });
  };

  window.dispatchEvent(
    new CustomEvent("rewireperform:update-available", {
      detail: { applyUpdate },
    })
  );
};

export async function registerSW() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  const isNativeShell = !!(window as any).Capacitor?.isNativePlatform?.();
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

  let hasReloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (hasReloaded) return;
    hasReloaded = true;
    window.location.reload();
  });

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      updateViaCache: "none",
    });

    const watchInstallingWorker = () => {
      const installing = registration.installing;
      if (!installing) return;

      installing.addEventListener("statechange", () => {
        if (installing.state === "installed" && navigator.serviceWorker.controller) {
          dispatchUpdateAvailable(registration);
        }
      });
    };

    registration.addEventListener("updatefound", watchInstallingWorker);

    const checkForUpdate = () => {
      if (document.visibilityState !== "visible") return;
      if (registration.waiting) {
        dispatchUpdateAvailable(registration);
        return;
      }
      void registration.update().catch(() => {});
    };

    const interval = window.setInterval(checkForUpdate, 15 * 60 * 1000);
    const onVisibility = () => checkForUpdate();
    const onFocus = () => checkForUpdate();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    window.addEventListener(
      "beforeunload",
      () => {
        window.clearInterval(interval);
        document.removeEventListener("visibilitychange", onVisibility);
        window.removeEventListener("focus", onFocus);
      },
      { once: true }
    );

    checkForUpdate();
  } catch (err) {
    console.warn("[pwa] SW registration failed:", err);
  }
}
