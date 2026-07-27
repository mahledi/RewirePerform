import { Capacitor } from "@capacitor/core";

export type FeedbackTechnicalContext = {
  schema_version: "feedback-technical-context-v1";
  runtime: "native" | "standalone" | "browser" | "unknown";
  platform: "ios" | "android" | "web" | "unknown";
  route: string | null;
  online: boolean | null;
  app_version: string;
};

const RELEASE_VERSION_PATTERN =
  /^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}(?:\+[0-9]{1,10})?$/;

export const normalizeFeedbackAppVersion = (value: unknown) =>
  typeof value === "string" && RELEASE_VERSION_PATTERN.test(value)
    ? value
    : "unknown";

const safeRoute = () => {
  if (typeof window === "undefined") return null;
  const pathname = window.location.pathname;
  return pathname.startsWith("/") && pathname.length <= 160 ? pathname : null;
};

const isStandaloneWebApp = () => {
  if (typeof window === "undefined") return false;
  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };
  return navigatorWithStandalone.standalone === true
    || window.matchMedia?.("(display-mode: standalone)").matches === true;
};

export const buildFeedbackTechnicalContext = (): FeedbackTechnicalContext => {
  const native = Capacitor.isNativePlatform();
  const nativePlatform = native ? Capacitor.getPlatform() : "web";
  const platform = nativePlatform === "ios" || nativePlatform === "android"
    ? nativePlatform
    : nativePlatform === "web"
      ? "web"
      : "unknown";

  return {
    schema_version: "feedback-technical-context-v1",
    runtime: native ? "native" : isStandaloneWebApp() ? "standalone" : "browser",
    platform,
    route: safeRoute(),
    online: typeof navigator === "undefined" ? null : navigator.onLine,
    app_version: normalizeFeedbackAppVersion(import.meta.env.VITE_APP_VERSION),
  };
};
