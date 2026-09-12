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
    await expect(page.getByText("Die aktuelle Version konnte nicht geladen werden. Bitte prüfe deine Verbindung und öffne die App erneut.")).toBeVisible();
    const brandImage = page.locator(".brand img");
    await expect(brandImage).toBeVisible();
    expect(await brandImage.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  } finally {
    await context.setOffline(false);
  }
});
