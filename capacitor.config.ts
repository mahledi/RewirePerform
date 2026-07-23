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
  ios: {
    contentInset: "automatic",
    limitsNavigationsToAppBoundDomains: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 900,
      launchAutoHide: false,
      backgroundColor: "#0D0E12",
      showSpinner: false,
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
