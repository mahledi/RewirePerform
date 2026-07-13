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
      launchAutoHide: true,
      backgroundColor: "#0e1217",
      showSpinner: false,
      iosSpinnerStyle: "small",
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#0e1217",
      overlaysWebView: false,
    },
    LocalNotifications: {
      presentationOptions: ["badge", "banner", "list"],
    },
  },
};

export default config;
