/**
 * Service-Worker-Registrierung mit harten Guards:
 * - Niemals in Dev (import.meta.env.DEV)
 * - Niemals in einem iframe (Lovable-Preview)
 * - Niemals auf Lovable-Preview-Hostnamen
 *
 * In allen "verbotenen" Kontexten werden vorhandene SWs deregistriert,
 * damit kein veralteter Cache hängen bleibt.
 */
export async function registerSW() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

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

  try {
    const { registerSW: register } = await import("virtual:pwa-register");
    register({ immediate: true });
  } catch (err) {
    console.warn("[pwa] SW registration failed:", err);
  }
}
