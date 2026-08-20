import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.rewireperform.app",
  appName: "RewirePerform",
  webDir: "dist",
  bundledWebRuntime: false,
  server: {
    hostname: "rewireperform.com",
    iosScheme: "capacitor",
  },
  android: {
    backgroundColor: "#0D0E12",
    allowMixedContent: false,
    captureInput: false,
    webContentsDebuggingEnabled: false,
    loggingBehavior: "debug",
    useLegacyBridge: false,
  },
  ios: {
    backgroundColor: "#0D0E12",
    contentInset: "automatic",
    limitsNavigationsToAppBoundDomains: false,
  },
  plugins: {
    SystemBars: {
      // adjustResize already accounts for the IME. Capacitor's CSS inset bridge
      // otherwise adds the keyboard height a second time on Android 10 WebView.
      insetsHandling: "disable",
    },
    SplashScreen: {
      launchShowDuration: 900,
      launchAutoHide: false,
      backgroundColor: "#0D0E12",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
      iosSpinnerStyle: "small",
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#0D0E12",
      overlaysWebView: false,
    },
    LocalNotifications: {
      presentationOptions: ["badge", "banner", "list"],
    },
  },
};

export default config;
