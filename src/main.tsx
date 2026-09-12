import { Capacitor } from "@capacitor/core";
import { Analytics } from "@vercel/analytics/react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerSW } from "./lib/registerSW";
import { configureNativeShell } from "./lib/nativeApp";

const webAnalyticsEnabled = import.meta.env.VITE_WEB_ANALYTICS_ENABLED === "true"
  && !Capacitor.isNativePlatform();

createRoot(document.getElementById("root")!).render(
  <>
    <App />
    {webAnalyticsEnabled ? <Analytics mode="production" /> : null}
  </>,
);

configureNativeShell();

// PWA service worker — only in production, only outside Lovable preview/iframes.
registerSW();
