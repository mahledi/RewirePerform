import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerSW } from "./lib/registerSW";

createRoot(document.getElementById("root")!).render(<App />);

// PWA service worker — only in production, only outside Lovable preview/iframes.
registerSW();
