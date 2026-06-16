import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: "autoUpdate",
      injectRegister: false, // we register manually with iframe/preview guard
      devOptions: {
        enabled: false, // never in dev/preview
      },
      includeAssets: ["app-icon.png", "robots.txt"],
      manifest: {
        name: "RewirePerform",
        short_name: "RewirePerform",
        description: "Mentale Performance für Sportler – 56-Tage-Programm",
        theme_color: "#0e1217",
        background_color: "#0e1217",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "/app-icon.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/app-icon.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },
      injectManifest: {
        globPatterns: ["offline.html"],
        globIgnores: ["**/index.html"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
