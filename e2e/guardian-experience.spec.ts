import { expect, test, type Page, type TestInfo } from "@playwright/test";

test.use({ serviceWorkers: "block" });

const expectNoHorizontalOverflow = async (page: Page) => {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
};

const expectPrimaryTouchTargets = async (page: Page) => {
  const undersized = await page.locator("main button:not([role=checkbox]), main label").evaluateAll((elements) => elements
    .filter((element) => {
      const style = window.getComputedStyle(element);
      return style.display !== "none" && style.visibility !== "hidden";
    })
    .map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        label: element.getAttribute("aria-label") || element.textContent?.trim().slice(0, 80),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
    })
    .filter(({ width, height }) => width < 44 || height < 44));
  expect(undersized).toEqual([]);
};

const capture = async (page: Page, testInfo: TestInfo, name: string) => {
  await page.screenshot({
    path: testInfo.outputPath(`${name}.png`),
    fullPage: true,
    animations: "disabled",
  });
};

const mockGuardianApi = async (page: Page) => {
  await page.route("**/functions/v1/minor-guardian-public", async (route) => {
    const body = route.request().postDataJSON() as { action?: string };
    const responses: Record<string, unknown> = {
      inspect: {
        state: "pending",
        policy_key: "de_minor_product_v2_2026_07",
        athlete_first_name: "Luka",
      },
      decide: {
        state: "approved",
        receiptDelivery: "sent",
        manageUrl: "https://rewireperform.com/guardian/decision#manage=synthetic-management-token",
      },
      "inspect-management": {
        state: "active",
        product_status: "authorized",
        data_contribution_status: "authorized",
        data_contribution_guardian: true,
        athlete_first_name: "Luka",
      },
      "withdraw-data-contribution": {
        state: "active",
        product_status: "authorized",
        data_contribution_status: "declined",
        data_contribution_guardian: false,
        athlete_first_name: "Luka",
      },
    };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(responses[body.action ?? ""] ?? { state: "invalid" }),
    });
  });
};

test("guardian decision is personalized, explicit and responsive", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await mockGuardianApi(page);

  await page.goto(`/guardian/decision#token=${"a".repeat(48)}`);
  await expect(page.getByRole("heading", { level: 1, name: "Luka möchte RewirePerform nutzen." })).toBeVisible();
  await expect(page.getByText("Luka hat deine E-Mail-Adresse als Kontakt einer sorgeberechtigten Person angegeben.", { exact: false })).toBeVisible();
  const product = page.getByRole("checkbox", { name: /Nutzung des RewirePerform-Programms erlauben/ });
  const pilot = page.getByRole("checkbox", { name: /Teilnahme an der Pilot-Auswertung erlauben/ });
  const declaration = page.getByRole("checkbox", { name: /Ich bestätige, dass ich.*sorgeberechtigt/ });
  await expect(product).not.toBeChecked();
  await expect(pilot).not.toBeChecked();
  await expect(declaration).not.toBeChecked();
  await expect(page.getByRole("button", { name: "Zugang erlauben" })).toBeDisabled();
  await declaration.click();
  await expect(declaration).toBeChecked();
  await product.click();
  await expect(product).toBeChecked();
  await expect(page.getByRole("button", { name: "Zugang erlauben" })).toBeEnabled();
  await expectNoHorizontalOverflow(page);
  await expectPrimaryTouchTargets(page);
  await capture(page, testInfo, "guardian-decision");

  await page.getByRole("button", { name: "Zugang erlauben" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Entscheidung gespeichert" })).toBeVisible();
  await expect(page.getByText("Luka entscheidet jetzt zusätzlich selbst.", { exact: false })).toBeVisible();
  expect(errors).toEqual([]);
});

test("guardian management withdraws pilot data without removing program access", async ({ page }, testInfo) => {
  await mockGuardianApi(page);

  await page.goto(`/guardian/decision#manage=${"b".repeat(48)}`);
  await expect(page.getByRole("heading", { level: 1, name: "Freigabe verwalten" })).toBeVisible();
  await expect(page.getByText("gesamte Freigabe für Luka widerrufen", { exact: false })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectPrimaryTouchTargets(page);
  await capture(page, testInfo, "guardian-management");

  await page.getByRole("button", { name: "Pilot-Auswertung beenden" }).click();
  await page.getByRole("button", { name: "Pilot-Auswertung beenden" }).click();
  await expect(page.getByRole("status")).toContainText("Der normale Programmzugang bleibt aktiv");
  const pilotSection = page.getByText("Pilot-Auswertung", { exact: true }).locator("../..");
  await expect(pilotSection.getByText("Nicht aktiv", { exact: true })).toBeVisible();
});

test("guardian emails use the same branded source as delivery", async ({ page }, testInfo) => {
  await page.goto("/internal/email-preview");
  const frame = page.frameLocator('iframe[title="Elternfreigabe anfragen Vorschau"]');
  await expect(frame.getByRole("heading", { name: "Luka möchte RewirePerform nutzen." })).toBeVisible();
  await expect(frame.getByRole("link", { name: "Teilnahme für Luka prüfen" })).toBeVisible();
  await expect(frame.getByText("weder nach einem Passwort noch nach Zahlungsdaten", { exact: false })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await capture(page, testInfo, "guardian-invitation-email");

  await page.getByLabel("E-Mail-Typ").selectOption("guardianReceipt");
  const receiptFrame = page.frameLocator('iframe[title="Elternfreigabe bestätigen Vorschau"]');
  await expect(receiptFrame.getByRole("heading", { name: "Freigabe für Luka gespeichert." })).toBeVisible();
  await expect(receiptFrame.getByRole("link", { name: "Freigabe verwalten oder widerrufen" })).toBeVisible();
  await capture(page, testInfo, "guardian-receipt-email");
});
