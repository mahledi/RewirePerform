import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";

const harnessDirectory = fileURLToPath(new URL(".", import.meta.url));
const repositoryRoot = fileURLToPath(new URL("../../..", import.meta.url));

export default defineConfig({
  root: harnessDirectory,
  publicDir: fileURLToPath(new URL("../../../public", import.meta.url)),
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: "@/contexts/AuthContext",
        replacement: fileURLToPath(new URL("./mockAuth.tsx", import.meta.url)),
      },
      {
        find: "@/integrations/supabase/client",
        replacement: fileURLToPath(new URL("./mockSupabase.ts", import.meta.url)),
      },
      {
        find: "@",
        replacement: fileURLToPath(new URL("../../../src", import.meta.url)),
      },
    ],
  },
  server: {
    fs: {
      allow: [repositoryRoot],
    },
  },
});
