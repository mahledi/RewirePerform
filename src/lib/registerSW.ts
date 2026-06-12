/**
 * Service-Worker-Registrierung mit harten Guards:
 * - Niemals in Dev (import.meta.env.DEV)
 * - Niemals in einem iframe (Lovable-Preview)
 * - Niemals auf Lovable-Preview-Hostnamen
 *
 * In allen "verbotenen" Kontexten werden vorhandene SWs deregistriert,
 * damit kein veralteter Cache hängen bleibt.
 *
 * Produktion: aggressive Update-Strategie, damit Safari & Co. neue Deploys
 * sofort übernehmen (Update-Check bei Tab-Fokus/Sichtbarkeitswechsel +
 * automatischer Reload, sobald ein neuer SW die Kontrolle übernimmt).
 */
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
    // Cleanup any leftover SW registrations to avoid stale caches in preview/dev.
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

  // Reload, sobald ein neuer Service Worker die Kontrolle übernimmt – so sehen
  // Nutzer in Safari/iOS direkt die neue Version statt der gecachten alten.
  let hasReloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (hasReloaded) return;
    hasReloaded = true;
    window.location.reload();
  });

  try {
    const { registerSW: register } = await import("virtual:pwa-register");
    let updateSW: ((reloadPage?: boolean) => Promise<void>) | undefined;
    updateSW = register({
      immediate: true,
      onNeedRefresh() {
        void updateSW?.(true);
      },
      onRegistered(registration) {
        if (!registration) return;

        const checkForUpdate = () => {
          if (document.visibilityState === "visible") {
            void registration.update().catch(() => {});
          }
        };

        // Periodisch (alle 15 Minuten) auf neue Builds prüfen.
        const interval = window.setInterval(checkForUpdate, 15 * 60 * 1000);

        // Sofortiger Check bei Tab-Fokus & Sichtbarkeitswechsel – wichtig für
        // Safari, das sonst sehr lange am alten SW kleben bleibt.
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
          { once: true },
        );

        // Initial gleich einmal prüfen, falls schon ein neuer Build live ist.
        checkForUpdate();
      },
    });
  } catch (err) {
    console.warn("[pwa] SW registration failed:", err);
  }
}
