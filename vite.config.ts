import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

const retiredSupabaseRefs = ["towgvykgezrmkbyudjen", "twceqincrbrenyuqukpj"];

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ""), ...process.env };
  const configuredTarget = `${env.VITE_SUPABASE_PROJECT_ID ?? ""} ${env.VITE_SUPABASE_URL ?? ""}`;
  const retiredTarget = retiredSupabaseRefs.find((projectRef) =>
    configuredTarget.includes(projectRef),
  );
  if (retiredTarget) {
    throw new Error(
      `Build blocked: Supabase project ${retiredTarget} is retired.`,
    );
  }

  return {
    server: {
      host: env.DEV_SERVER_HOST?.trim() || "127.0.0.1",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            supabase: ["@supabase/supabase-js"],
          },
        },
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
        includeAssets: [
          "app-icon-192.png",
          "app-icon-512.png",
          "apple-touch-icon-180.png",
          "favicon-32.png",
          "favicon-64.png",
          "brand/rewireperform-symbol-dark.svg",
          "brand/rewireperform-symbol-light.svg",
          "robots.txt",
        ],
        manifest: {
          name: "RewirePerform",
          short_name: "RewirePerform",
          description: "Mentale Performance für Sportler – 56-Tage-Programm",
          theme_color: "#0D0E12",
          background_color: "#0D0E12",
          display: "standalone",
          start_url: "/",
          scope: "/",
          icons: [
            {
              src: "/app-icon-192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "/app-icon-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any maskable",
            },
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
  };
});
