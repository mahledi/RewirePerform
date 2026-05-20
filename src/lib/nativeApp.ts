import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";

export async function configureNativeShell() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: "#0e1217" });
    await StatusBar.setOverlaysWebView({ overlay: false });
  } catch (err) {
    console.warn("[native] status bar setup failed:", err);
  }

  try {
    await SplashScreen.hide();
  } catch (err) {
    console.warn("[native] splash screen hide failed:", err);
  }
}
