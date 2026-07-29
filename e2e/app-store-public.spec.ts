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

const firstRunSceneHeadings = [
  "Du siehst sofort, was ansteht.",
  "Zuerst verstehst du den Fokus des Tages.",
  "Drei konkrete Aufgaben bringen ihn in deinen Alltag.",
  "Ein kurzer Check festigt, was du heute brauchst.",
  "Vor dem Training siehst du denselben Fokus wieder.",
  "Am Abend reflektierst du den echten Tag.",
  "Du siehst deine Wiederholungen, nicht eine Bewertung.",
  "Viele Signale. Ein gemeinsamer Verlauf.",
  "Der gleiche klare Ablauf – passend zu deinem Alltag.",
  "Dein Weg beginnt mit dem ersten Tag.",
] as const;

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
  await expect(page.getByRole("link", { name: "support@rewireperform.com" })).toHaveAttribute(
    "href",
    "mailto:support@rewireperform.com",
  );
  await expectNoHorizontalOverflow(page);

  expect(pageErrors).toEqual([]);
});

test("auth flow exposes accessible controls and legal links", async ({ page }, testInfo) => {
  await page.goto("/auth");
  await expect(page.getByRole("heading", { level: 1, name: "Wie startest du?" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Datenschutz" })).toHaveAttribute("href", "/privacy");
  await expect(
    page.getByLabel("Rechtliches und Hilfe").getByRole("link", { name: "Support" }),
  ).toHaveAttribute("href", "/support");

  await page.getByRole("button", { name: /Allein starten/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Du startest allein." })).toBeVisible();
  await expect(page.getByLabel("Vollständiger Name")).toHaveAttribute("autocomplete", "name");
  await expect(page.getByLabel("E-Mail")).toHaveAttribute("autocomplete", "email");
  await expect(page.getByLabel("Passwort")).toHaveAttribute("autocomplete", "new-password");
  await expectNoHorizontalOverflow(page);
  await capture(page, testInfo, "auth-signup");
});

test("public introduction completes without collecting personal data", async ({ page }, testInfo) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/welcome");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();

  for (const [index, heading] of firstRunSceneHeadings.entries()) {
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    await expect(page.getByLabel(`Schritt ${index + 1} von 10`)).toBeVisible();
    expect(await page.evaluate(() => window.localStorage.length)).toBe(0);
    await expectNoHorizontalOverflow(page);

    if (index === 0) await capture(page, testInfo, "introduction-today");
    if (index === 7) await capture(page, testInfo, "introduction-measurement");
    if (index < firstRunSceneHeadings.length - 1) {
      await page.getByRole("button", { name: "Weiter" }).click();
    }
  }

  await expect(page.getByRole("group", { name: "Programmweg auswählen" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Solo" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Team" })).toHaveAttribute("aria-pressed", "false");
  await capture(page, testInfo, "introduction-start");

  await page.getByRole("button", { name: "Registrierung starten" }).click();
  await expect(page).toHaveURL(/\/auth\?mode=signup&intent=solo$/);
  await expect(page.getByRole("heading", { level: 1, name: "Du startest allein." })).toBeVisible();

  const storedValues = await page.evaluate(() =>
    Object.fromEntries(
      Array.from({ length: window.localStorage.length }, (_, index) => {
        const key = window.localStorage.key(index) ?? "";
        return [key, window.localStorage.getItem(key)];
      }),
    ),
  );
  expect(storedValues).toEqual({ "rewireperform:public-onboarding": "1" });
  expect(pageErrors).toEqual([]);
});

test("public introduction remains accessible with reduced motion and large text", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/welcome");
  await page.evaluate(() => {
    window.localStorage.clear();
    document.documentElement.style.fontSize = "150%";
  });
  await page.reload();
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "150%";
  });

  expect(await page.evaluate(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
  await expect(page.getByRole("heading", { level: 1, name: firstRunSceneHeadings[0] })).toBeVisible();
  await expect(page.getByLabel("Schritt 1 von 10")).toBeVisible();
  await expect(page.getByRole("button", { name: "Weiter" })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  const accessibilityTree = await page.locator("main").ariaSnapshot();
  expect(accessibilityTree).toContain(firstRunSceneHeadings[0]);
  expect(accessibilityTree).toContain("Weiter");
  await capture(page, testInfo, "introduction-large-text-reduced-motion");

  for (let index = 1; index < firstRunSceneHeadings.length; index += 1) {
    await page.getByRole("button", { name: "Weiter" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: firstRunSceneHeadings[index] }),
    ).toBeVisible();
  }

  await expect(page.getByRole("button", { name: "Registrierung starten" })).toBeVisible();
  const roleGroup = page.getByRole("group", { name: "Programmweg auswählen" });
  await roleGroup.scrollIntoViewIfNeeded();
  const roleGroupBox = await roleGroup.boundingBox();
  const footerBox = await page.getByTestId("first-run-footer").boundingBox();
  expect(roleGroupBox).not.toBeNull();
  expect(footerBox).not.toBeNull();
  expect(roleGroupBox!.y + roleGroupBox!.height).toBeLessThanOrEqual(footerBox!.y + 1);
  await expectNoHorizontalOverflow(page);
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

test.describe("password recovery", () => {
  test.use({ serviceWorkers: "block" });

  test("reset request uses a neutral, accessible recovery state", async ({ page }, testInfo) => {
    let interceptedRecoveries = 0;
    await page.context().route(/^https:\/\/test\.supabase\.co\/auth\/v1\/recover(?:\?.*)?$/, async (route) => {
      interceptedRecoveries += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({}),
      });
    });

    await page.goto("/auth?mode=forgot");
    await expect(page.getByRole("heading", { level: 1, name: "Passwort zurücksetzen." })).toBeVisible();
    await page.getByLabel("E-Mail").fill("qa-recovery@example.com");
    await page.getByRole("button", { name: "Reset-E-Mail senden" }).click();

    await expect.poll(() => interceptedRecoveries).toBe(1);
    await expect(page.getByRole("heading", { level: 1, name: "Prüfe deine E-Mails." })).toBeVisible();
    await expect(page.getByText(/Falls ein Konto für/)).toBeVisible();
    await expect(page.getByLabel("Sechsstelliger Sicherheitscode")).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await capture(page, testInfo, "auth-password-recovery");
  });

  test("expired recovery links expose a safe retry path", async ({ page }, testInfo) => {
    await page.goto("/auth/reset-password#error=access_denied&error_code=otp_expired");

    await expect(page.getByRole("heading", { level: 1, name: "Der Link ist nicht mehr gültig." })).toBeVisible();
    await expect(page.getByRole("link", { name: "Neuen Link anfordern" })).toHaveAttribute("href", "/auth?mode=forgot");
    await expect(page.getByRole("link", { name: "Zur Anmeldung" })).toHaveAttribute("href", "/auth");
    await expectNoHorizontalOverflow(page);
    await capture(page, testInfo, "auth-expired-recovery-link");
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
