import { mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import process from "node:process";
import { chromium, webkit } from "@playwright/test";

const portOffset = createHash("sha256")
  .update(process.cwd())
  .digest()
  .readUInt16BE(0) % 5_000;
const port = Number(process.env.MINOR_PREVIEW_PORT ?? 35_000 + portOffset);
const baseUrl = `http://127.0.0.1:${port}`;
const previewUrl = `${baseUrl}/internal/minor-consent-preview`;
const outputDir = "test-results/minor-guardian-preview";

const states = [
  "age-check",
  "guardian-contact",
  "guardian-pending",
  "guardian-email",
  "guardian-review",
  "guardian-complete",
  "athlete-assent",
  "authorized",
  "guardian-declined",
  "athlete-declined",
  "revoked",
  "expired",
  "age-16-17-decision",
  "adult-ready",
  "settings",
];

const screenshots = new Set([
  "age-check",
  "guardian-email",
  "guardian-review",
  "athlete-assent",
  "settings",
]);

const server = spawn(
  "npm",
  ["run", "dev", "--", "--host", "127.0.0.1", "--port", `${port}`, "--strictPort"],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      VITE_APP_ENV: "test",
      VITE_SUPABASE_PROJECT_ID: "example",
      VITE_SUPABASE_PUBLISHABLE_KEY: "test-publishable-key",
      VITE_SUPABASE_URL: "https://example.supabase.co",
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);

let serverOutput = "";
server.stdout.on("data", (chunk) => { serverOutput += chunk.toString(); });
server.stderr.on("data", (chunk) => { serverOutput += chunk.toString(); });

const waitForServer = async () => {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`Preview server exited early.\n${serverOutput}`);
    }
    try {
      const response = await fetch(previewUrl);
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Preview server did not start.\n${serverOutput}`);
};

const verifyLayout = async (page, engineName, state) => {
  const metrics = await page.evaluate(() => {
    const root = document.documentElement;
    const overflowing = Array.from(document.querySelectorAll("body *"))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName,
          text: (element.textContent ?? "").trim().slice(0, 80),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
        };
      })
      .filter((element) => element.left < -1 || element.right > root.clientWidth + 1)
      .slice(0, 10);

    return {
      clientWidth: root.clientWidth,
      scrollWidth: root.scrollWidth,
      overflowing,
    };
  });

  if (metrics.scrollWidth > metrics.clientWidth + 1 || metrics.overflowing.length > 0) {
    throw new Error(`${engineName}/${state} has horizontal overflow: ${JSON.stringify(metrics)}`);
  }
};

const runBrowser = async ({ engine, name, viewport }) => {
  const browser = await engine.launch();
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  const unexpectedBackendRequests = [];

  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("request", (request) => {
    if (/supabase\.co|\/functions\/v1\//.test(request.url())) {
      unexpectedBackendRequests.push(request.url());
    }
  });

  await page.goto(previewUrl, { waitUntil: "networkidle" });
  await page.getByRole("heading", { level: 1, name: "Minderjährigen- und Elternflow" }).waitFor();
  if (viewport.width <= 390) {
    await page.getByRole("button", { name: "Mobile Vorschau" }).click();
  }

  for (const state of states) {
    await page.locator("#minor-preview-state").selectOption(state);
    await verifyLayout(page, name, state);

    if (screenshots.has(state)) {
      await page.screenshot({
        path: `${outputDir}/${name}-${state}.png`,
        fullPage: true,
        animations: "disabled",
      });
    }
  }

  if (pageErrors.length > 0) throw new Error(`${name} page errors: ${pageErrors.join(" | ")}`);
  if (consoleErrors.length > 0) throw new Error(`${name} console errors: ${consoleErrors.join(" | ")}`);
  if (unexpectedBackendRequests.length > 0) {
    throw new Error(`${name} preview contacted a backend: ${unexpectedBackendRequests.join(" | ")}`);
  }

  await context.close();
  await browser.close();
};

try {
  await mkdir(outputDir, { recursive: true });
  await waitForServer();
  await runBrowser({ engine: chromium, name: "desktop-chromium", viewport: { width: 1440, height: 1000 } });
  await runBrowser({ engine: webkit, name: "iphone-webkit", viewport: { width: 390, height: 844 } });
  process.stdout.write(`Minor guardian preview verified in Chromium and WebKit. Screenshots: ${outputDir}\n`);
} finally {
  server.kill("SIGTERM");
}
