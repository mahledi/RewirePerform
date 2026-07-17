import { expect, test } from "@playwright/test";

test.use({ serviceWorkers: "allow" });

test("installed web app serves its static fallback while offline", async ({ browserName, context, page }) => {
  test.skip(browserName !== "chromium", "Chromium provides deterministic service-worker offline control in Playwright.");

  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (navigator.serviceWorker.controller) return;
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(
        () => reject(new Error("Service worker did not take control")),
        5_000,
      );
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        window.clearTimeout(timeout);
        resolve();
      }, { once: true });
    });
  });

  await context.setOffline(true);
  try {
    const response = await page.goto(`/privacy?offline-smoke=${Date.now()}`);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: "Gerade offline" })).toBeVisible();
    await expect(page.getByText("RewirePerform konnte die aktuelle Version nicht laden.")).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
});
