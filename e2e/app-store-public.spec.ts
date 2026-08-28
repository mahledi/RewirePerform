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
  "Eine klare Mission bringt ihn in deinen Alltag.",
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
  await expect(page.locator("#golden-hero-title")).toContainText("Trainiere das System");
  await expect(page.getByRole("button", { name: "System verstehen" })).toBeVisible();
  await expect(page.getByRole("link", { name: "RewirePerform im App Store laden" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "RewirePerform im App Store laden" }).first()).toHaveAttribute(
    "href",
    "https://apps.apple.com/de/app/rewireperform/id6795463263",
  );
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

test("team invitation is a professional app-and-web handoff", async ({ page }, testInfo) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/join?team=abc123");
  await expect(page.getByRole("heading", { name: "Dein Team wartet auf dich." })).toBeVisible();
  await expect(page.getByText("ABC123")).toBeVisible();
  await expect(page.getByRole("link", { name: /Teambeitritt starten/ })).toHaveAttribute(
    "href",
    "/auth?mode=signup&intent=join&team=ABC123",
  );
  await expect(page.getByRole("link", { name: "RewirePerform im App Store" })).toHaveAttribute(
    "href",
    "https://apps.apple.com/de/app/rewireperform/id6795463263",
  );
  await expectNoHorizontalOverflow(page);
  await capture(page, testInfo, "team-invitation");

  await page.goto("/join?team=BAD%2F12");
  await expect(page.getByRole("alert")).toContainText("vollständigen Link");
  await expect(page.getByRole("link", { name: /Zur Registrierung/ })).toHaveAttribute(
    "href",
    "/auth?mode=signup&intent=join&invite_error=invalid",
  );
  await expectNoHorizontalOverflow(page);
  expect(pageErrors).toEqual([]);
});

test("auth flow exposes accessible controls and legal links", async ({ page }, testInfo) => {
  await page.goto("/auth?mode=signup&intent=solo&intro=athlete");
  await expect(page.getByRole("heading", { level: 1, name: "Du startest allein." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Datenschutz" })).toHaveAttribute("href", "/privacy");
  await expect(
    page.getByLabel("Rechtliches und Hilfe").getByRole("link", { name: "Support" }),
  ).toHaveAttribute("href", "/support");

  await expect(page.getByLabel("Vollständiger Name")).toHaveAttribute("autocomplete", "name");
  await expect(page.getByLabel("E-Mail")).toHaveAttribute("autocomplete", "email");
  await expect(page.getByLabel("Passwort", { exact: true })).toHaveAttribute("autocomplete", "new-password");
  await expectNoHorizontalOverflow(page);
  await capture(page, testInfo, "auth-signup");
});

test("organization inquiry review stays aligned and explains privacy in-app", async ({ page }) => {
  await page.goto("/team-access");
  await expect(page.getByRole("heading", { name: "Wie möchtet ihr RewirePerform einführen?" })).toBeVisible();
  await page.getByRole("button", { name: /Verein oder Organisation einführen/ }).click();
  await page.getByLabel("Name").fill("Alexandra Beispielperson mit langem Namen");
  await page.getByLabel("Funktion / Position").fill("Sportliche Leitung und Organisationsentwicklung");
  await page.getByLabel("Geschäftliche E-Mail").fill("alexandra.beispielperson@sehr-langer-vereinsname-in-deutschland.de");
  await page.getByLabel("Organisation").fill("Sportverein mit einem außergewöhnlich langen Organisationsnamen");
  await page.getByRole("button", { name: "Verein", exact: true }).click();
  await page.getByLabel("Sportart(en)").fill("Volleyball, Fußball, Leichtathletik");
  await page.getByRole("button", { name: "Weiter", exact: true }).click();

  await page.getByRole("button", { name: /Mentale Routinen im Alltag verankern/ }).click();
  await page.getByRole("button", { name: "Persönliche Einführung" }).click();
  await page.getByRole("button", { name: "Anpassung an die Organisation" }).click();
  await page.getByRole("button", { name: "Reporting und Auswertung" }).click();
  await page.getByRole("button", { name: "Weiter", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Bereit für den nächsten Schritt." })).toBeVisible();
  await expect(page.getByText("alexandra.beispielperson@sehr-langer-vereinsname-in-deutschland.de", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Anfrage absenden" })).toBeEnabled();
  await expect(page.getByText(/Teststand:/)).toHaveCount(0);
  await expectNoHorizontalOverflow(page);

  await page.getByRole("button", { name: "Datenschutz zur Anfrage ansehen" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Datenschutz bei eurer Anfrage" })).toBeVisible();
  await expect(page.getByText(/keine Namen oder persönlichen Daten von Athleten/i)).toBeVisible();
  await expect(page.getByText(/spätestens zwölf Monate nach Abschluss/i)).toBeVisible();
  await expect(page.getByText(/Fake- oder Spam-Anfragen.*sofort vollständig gelöscht/i)).toBeVisible();
  await page.getByRole("button", { name: "Verstanden" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("the role-specific athlete introduction is intentionally available before authentication", async ({ page }) => {
  await page.goto("/start");
  await expect(page.getByRole("heading", { level: 1, name: "Wie nutzt du RewirePerform?" })).toBeVisible();
  await page.getByRole("button", { name: /Ich bin Athlet/ }).click();
  await expect(page).toHaveURL(/\/start\/athlete$/);
  await expect(page.getByRole("heading", { level: 1, name: firstRunSceneHeadings[0] })).toBeVisible();
});

test("internal introduction evidence completes without collecting personal data", async ({ page }, testInfo) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/internal/first-run-preview");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();

  for (const [index, heading] of firstRunSceneHeadings.entries()) {
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    if (index < firstRunSceneHeadings.length - 1) {
      await expect(page.getByLabel(`Schritt ${index + 1} von 10`)).toBeVisible();
    } else {
      await expect(page.getByLabel("Schritt 10 von 10")).toHaveCount(0);
    }
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

  await page.getByRole("button", { name: "Vorschau erneut ansehen" }).click();
  await expect(page.getByRole("heading", { level: 1, name: firstRunSceneHeadings[0] })).toBeVisible();

  const storedValues = await page.evaluate(() =>
    Object.fromEntries(
      Array.from({ length: window.localStorage.length }, (_, index) => {
        const key = window.localStorage.key(index) ?? "";
        return [key, window.localStorage.getItem(key)];
      }),
    ),
  );
  expect(storedValues).toEqual({});
  expect(pageErrors).toEqual([]);
});

test("introduction evidence remains accessible with reduced motion and large text", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/internal/first-run-preview");
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

  await expect(page.getByRole("button", { name: "Vorschau erneut ansehen" })).toBeVisible();
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

    await page.goto("/auth?mode=signup&intent=solo&intro=athlete&redirect=%2Fadmin%2Fqa");
    await page.getByLabel("Vollständiger Name").fill("QA Confirmation");
    await page.getByLabel("E-Mail").fill("qa-confirmation@example.com");
    await page.getByLabel("Passwort", { exact: true }).fill("secure-test-password");
    expect(await page.getByLabel("Vollständiger Name").evaluate((element) => (element as HTMLInputElement).checkValidity())).toBe(true);
    expect(await page.getByLabel("E-Mail").evaluate((element) => (element as HTMLInputElement).checkValidity())).toBe(true);
    expect(await page.getByLabel("Passwort", { exact: true }).evaluate((element) => (element as HTMLInputElement).checkValidity())).toBe(true);
    await page.getByRole("button", { name: "Konto erstellen" }).click();

    await expect.poll(() => interceptedSignups).toBe(1);
    await expect(page.getByRole("heading", { level: 1, name: "Bestätige deine E-Mail." })).toBeVisible();
    await expect(page.getByText("qa-confirmation@example.com")).toBeVisible();
    await expect(page.getByRole("button", { name: "E-Mail erneut senden" })).toBeVisible();
    await expect(page.getByRole("button", { name: "E-Mail-Adresse ändern" })).toBeVisible();
    const confirmationUrl = new URL(page.url());
    expect(confirmationUrl.pathname).toBe("/auth");
    expect(confirmationUrl.searchParams.get("mode")).toBe("signup");
    expect(confirmationUrl.searchParams.get("intent")).toBe("solo");
    expect(confirmationUrl.searchParams.get("intro")).toBe("athlete");
    expect(confirmationUrl.searchParams.get("redirect")).toBe("/admin/qa");
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
