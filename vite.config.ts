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
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;

          const normalizedId = id.replace(/\\/g, "/");
          if (normalizedId.includes("/node_modules/@sentry/")) return "vendor-sentry";
          if (normalizedId.includes("/node_modules/@supabase/")) return "vendor-supabase";
          if (
            normalizedId.includes("/node_modules/recharts/") ||
            normalizedId.includes("/node_modules/d3-")
          ) {
            return "vendor-charts";
          }
          if (normalizedId.includes("/node_modules/framer-motion/")) return "vendor-motion";
          if (normalizedId.includes("/node_modules/@radix-ui/")) return "vendor-radix";
          if (normalizedId.includes("/node_modules/date-fns/")) return "vendor-date";
          if (
            normalizedId.includes("/node_modules/react/") ||
            normalizedId.includes("/node_modules/react-dom/") ||
            normalizedId.includes("/node_modules/scheduler/")
          ) {
            return "vendor-react";
          }

          return undefined;
        },
      },
    },
  },
}));
