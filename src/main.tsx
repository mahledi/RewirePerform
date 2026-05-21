import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerSW } from "./lib/registerSW";
import { configureNativeShell } from "./lib/nativeApp";
import { initMonitoring } from "./lib/monitoring";

initMonitoring();
createRoot(document.getElementById("root")!).render(<App />);

configureNativeShell();

// PWA service worker — only in production, only outside Lovable preview/iframes.
registerSW();
