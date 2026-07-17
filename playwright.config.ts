import { createHash } from "node:crypto";
import { defineConfig, devices } from "@playwright/test";

const worktreePortOffset = createHash("sha256")
  .update(process.cwd())
  .digest()
  .readUInt16BE(0) % 20_000;
const e2ePort = Number(process.env.PLAYWRIGHT_PORT ?? 20_000 + worktreePortOffset);
const e2eBaseUrl = `http://127.0.0.1:${e2ePort}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  outputDir: "test-results",
  use: {
    baseURL: e2eBaseUrl,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: `VITE_ENABLE_EVIDENCE_PREVIEW=true VITE_SUPABASE_URL=https://test.supabase.co VITE_SUPABASE_PROJECT_ID=test VITE_SUPABASE_PUBLISHABLE_KEY=test-key VITE_APP_ENV=test npm run build && npm run preview -- --host 127.0.0.1 --port ${e2ePort} --strictPort`,
    url: e2eBaseUrl,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "iphone-webkit",
      use: { ...devices["iPhone 15 Pro"] },
    },
    {
      name: "iphone-landscape-webkit",
      use: {
        ...devices["iPhone 15 Pro"],
        viewport: { width: 852, height: 393 },
        screen: { width: 852, height: 393 },
      },
    },
    {
      name: "ipad-webkit",
      use: { ...devices["iPad Pro 11"] },
    },
    {
      name: "ipad-landscape-webkit",
      use: {
        ...devices["iPad Pro 11"],
        viewport: { width: 1194, height: 834 },
        screen: { width: 1194, height: 834 },
      },
    },
  ],
});
