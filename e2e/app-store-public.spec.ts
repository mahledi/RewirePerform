import { expect, test, type Page, type TestInfo } from "@playwright/test";

const expectNoHorizontalOverflow = async (page: Page) => {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
};

const capture = async (page: Page, testInfo: TestInfo, name: string) => {
  await page.screenshot({
    path: testInfo.outputPath(`${name}.png`),
    fullPage: true,
    animations: "disabled",
  });
};

test("public product and legal routes render cleanly", async ({ page }, testInfo) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Trainiere das System");
  await expect(page.getByRole("button", { name: "Demo ansehen" }).first()).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await capture(page, testInfo, "home");

  await page.goto("/privacy");
  await expect(page.getByRole("heading", { level: 1, name: "RewirePerform Datenschutz" })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.goto("/support");
  await expect(page.getByRole("heading", { level: 1, name: "RewirePerform Support" })).toBeVisible();
  await expect(page.getByRole("link", { name: "hello@rewireperform.com" })).toHaveAttribute(
    "href",
    "mailto:hello@rewireperform.com",
  );
  await expectNoHorizontalOverflow(page);

  expect(pageErrors).toEqual([]);
});

test("auth flow exposes accessible controls and legal links", async ({ page }, testInfo) => {
  await page.goto("/auth");
  await expect(page.getByRole("heading", { level: 1, name: "Wie startest du?" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Datenschutz" })).toHaveAttribute("href", "/privacy");
  await expect(page.getByRole("link", { name: "Support" })).toHaveAttribute("href", "/support");

  await page.getByRole("button", { name: /Allein starten/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Du startest allein." })).toBeVisible();
  await expect(page.getByLabel("Vollständiger Name")).toHaveAttribute("autocomplete", "name");
  await expect(page.getByLabel("E-Mail")).toHaveAttribute("autocomplete", "email");
  await expect(page.getByLabel("Passwort")).toHaveAttribute("autocomplete", "new-password");
  await expectNoHorizontalOverflow(page);
  await capture(page, testInfo, "auth-signup");
});

test("synthetic demo remains interactive without real user data", async ({ page }, testInfo) => {
  await page.goto("/demo");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("RewirePerform im Alltag");
  await expect(page.getByText("Demo-Daten. Keine echten Athleten. Keine Speicherung.")).toBeVisible();
  await page.getByRole("button", { name: "Daily Flow testen" }).click();
  await expect(page.locator("#player-flow")).toBeInViewport();
  await expectNoHorizontalOverflow(page);
  await capture(page, testInfo, "demo-player-flow");
});

test("unknown routes use the German recovery path", async ({ page }) => {
  await page.goto("/nicht-vorhanden");
  await expect(page.getByRole("heading", { level: 1, name: "404" })).toBeVisible();
  await expect(page.getByText("Seite nicht gefunden")).toBeVisible();
  await expect(page.getByRole("link", { name: "Zur Startseite" })).toHaveAttribute("href", "/");
  await expectNoHorizontalOverflow(page);
});
