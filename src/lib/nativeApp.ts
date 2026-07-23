import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";

const APP_LOADING_SELECTOR = '[data-app-loading-shell="true"]';

export function configureNativeShell() {
  if (!Capacitor.isNativePlatform()) return () => {};

  void (async () => {
    try {
      await StatusBar.setStyle({ style: Style.Light });
      await StatusBar.setBackgroundColor({ color: "#0D0E12" });
      await StatusBar.setOverlaysWebView({ overlay: false });
    } catch (err) {
      console.warn("[native] status bar setup failed:", err);
    }
  })();

  const root = document.getElementById("root");
  if (!root) return () => {};

  let firstFrame: number | null = null;
  let secondFrame: number | null = null;
  let hidden = false;

  const cancelFrames = () => {
    if (firstFrame !== null) window.cancelAnimationFrame(firstFrame);
    if (secondFrame !== null) window.cancelAnimationFrame(secondFrame);
    firstFrame = null;
    secondFrame = null;
  };

  const observer = new MutationObserver(() => scheduleReadinessCheck());

  const hideWhenReady = () => {
    firstFrame = null;
    secondFrame = null;
    if (hidden || root.childElementCount === 0 || root.querySelector(APP_LOADING_SELECTOR)) return;

    hidden = true;
    observer.disconnect();
    void SplashScreen.hide({ fadeOutDuration: 120 }).catch((err: unknown) => {
      console.warn("[native] splash screen hide failed:", err);
    });
  };

  function scheduleReadinessCheck() {
    if (hidden) return;
    cancelFrames();
    firstFrame = window.requestAnimationFrame(() => {
      firstFrame = null;
      secondFrame = window.requestAnimationFrame(hideWhenReady);
    });
  }

  observer.observe(root, { childList: true, subtree: true });
  scheduleReadinessCheck();

  return () => {
    observer.disconnect();
    cancelFrames();
  };
}
