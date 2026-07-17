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

test.describe("email confirmation", () => {
  test.use({ serviceWorkers: "block" });

  test("signup awaiting email confirmation stops on a clear verification screen", async ({ page }, testInfo) => {
    let interceptedSignups = 0;
    await page.context().route(/^https:\/\/test\.supabase\.co\/auth\/v1\/signup(?:\?.*)?$/, async (route) => {
      interceptedSignups += 1;
      const now = new Date().toISOString();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: "00000000-0000-4000-8000-000000000001",
            aud: "authenticated",
            role: "authenticated",
            email: "qa-confirmation@example.com",
            phone: "",
            confirmation_sent_at: now,
            app_metadata: { provider: "email", providers: ["email"] },
            user_metadata: { full_name: "QA Confirmation", role: "athlete" },
            identities: [],
            created_at: now,
            updated_at: now,
          },
        }),
      });
    });

    await page.goto("/auth?redirect=%2Fadmin%2Fqa");
    await page.getByRole("button", { name: /Allein starten/ }).click();
    await page.getByLabel("Vollständiger Name").fill("QA Confirmation");
    await page.getByLabel("E-Mail").fill("qa-confirmation@example.com");
    await page.getByLabel("Passwort").fill("secure-test-password");
    expect(await page.getByLabel("Vollständiger Name").evaluate((element) => (element as HTMLInputElement).checkValidity())).toBe(true);
    expect(await page.getByLabel("E-Mail").evaluate((element) => (element as HTMLInputElement).checkValidity())).toBe(true);
    expect(await page.getByLabel("Passwort").evaluate((element) => (element as HTMLInputElement).checkValidity())).toBe(true);
    await page.getByRole("button", { name: "Konto erstellen" }).click();

    await expect.poll(() => interceptedSignups).toBe(1);
    await expect(page.getByRole("heading", { level: 1, name: "Bestätige deine E-Mail." })).toBeVisible();
    await expect(page.getByText("qa-confirmation@example.com")).toBeVisible();
    await expect(page.getByRole("button", { name: "E-Mail erneut senden" })).toBeVisible();
    await expect(page.getByRole("button", { name: "E-Mail-Adresse ändern" })).toBeVisible();
    await expect(page).toHaveURL(/\/auth\?redirect=%2Fadmin%2Fqa$/);
    await expectNoHorizontalOverflow(page);
    await capture(page, testInfo, "auth-email-confirmation");
  });
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
