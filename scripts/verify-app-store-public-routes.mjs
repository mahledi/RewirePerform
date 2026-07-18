#!/usr/bin/env node

import process from "node:process";
import { chromium } from "playwright";

const baseUrl = new URL(process.env.APP_STORE_PUBLIC_BASE_URL ?? "https://rewireperform.com");
const failures = [];

if (baseUrl.protocol !== "https:") {
  failures.push(`base URL must use HTTPS, got ${baseUrl.protocol}`);
}

const routes = [
  { path: "/", heading: null },
  { path: "/privacy", heading: "RewirePerform Datenschutz" },
  { path: "/support", heading: "RewirePerform Support" },
];

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

const browser = await chromium.launch({ headless: true });

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    for (const route of routes) {
      const url = new URL(route.path, baseUrl);
      const response = await page.goto(url.toString(), {
        waitUntil: "domcontentloaded",
        timeout: 30_000,
      });

      const status = response?.status() ?? 0;
      if (status < 200 || status >= 300) {
        failures.push(`${viewport.name} ${route.path}: HTTP ${status}`);
        continue;
      }

      await page.locator("h1").first().waitFor({ state: "visible", timeout: 15_000 });
      const heading = (await page.locator("h1").first().innerText()).trim();
      if (route.heading && heading !== route.heading) {
        failures.push(`${viewport.name} ${route.path}: expected heading ${JSON.stringify(route.heading)}, got ${JSON.stringify(heading)}`);
      }

      const finalUrl = new URL(page.url());
      if (finalUrl.protocol !== "https:" || finalUrl.hostname !== baseUrl.hostname) {
        failures.push(`${viewport.name} ${route.path}: unexpected final URL ${finalUrl.toString()}`);
      }

      const hasOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      );
      if (hasOverflow) failures.push(`${viewport.name} ${route.path}: horizontal overflow`);

      console.log(`PASS ${viewport.name} ${route.path} HTTP ${status} h1=${JSON.stringify(heading)}`);
    }

    const supportUrl = new URL("/support", baseUrl);
    await page.goto(supportUrl.toString(), { waitUntil: "domcontentloaded", timeout: 30_000 });
    const supportHref = await page.locator('a[href="mailto:hello@rewireperform.com"]').first().getAttribute("href");
    if (supportHref !== "mailto:hello@rewireperform.com") {
      failures.push(`${viewport.name} /support: monitored support email link is missing`);
    }

    if (pageErrors.length > 0) {
      failures.push(`${viewport.name}: page errors: ${pageErrors.join(" | ")}`);
    }

    await context.close();
  }
} finally {
  await browser.close();
}

if (failures.length > 0) {
  console.error("");
  console.error("Public App Store route checks failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("");
console.log("Public App Store route checks passed for desktop and mobile.");
