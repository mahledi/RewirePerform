import { expect, test, type Page, type TestInfo } from "@playwright/test";

const expectNoHorizontalOverflow = async (page: Page) => {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
};

const expectTouchTargets = async (page: Page) => {
  const undersized = await page.locator("button, label").evaluateAll((elements) => elements
    .map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        label: element.getAttribute("aria-label") || element.textContent?.trim().slice(0, 60),
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

test("athlete and coach evidence previews stay concise and operable", async ({ page }, testInfo) => {
  const browserErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));

  await page.goto("/internal/evidence-preview");
  await expect(page.getByRole("heading", { name: "Trotz Unsicherheit handeln" })).toBeVisible();
  await expect(page.getByRole("radio")).toHaveCount(5);
  await expectNoHorizontalOverflow(page);
  await expectTouchTargets(page);

  const firstResponse = page.getByRole("radio", { name: "Noch nicht" });
  await firstResponse.focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("radio", { name: "Teilweise" })).toBeChecked();
  await page.getByText("Meistens", { exact: true }).click();
  await expect(page.getByRole("radio", { name: "Meistens" })).toBeChecked();
  await capture(page, testInfo, "athlete-transfer-pulse");

  await page.getByRole("tab", { name: "Coach" }).click();
  await expect(page.getByRole("heading", { name: "Teambeobachtung" })).toBeVisible();
  await expect(page.getByRole("combobox")).toHaveCount(5);

  const attentionSelect = page.getByRole("combobox", { name: "Aufmerksamkeit zurückholen bewerten" });
  await attentionSelect.click();
  await page.getByRole("option", { name: "Meistens sichtbar" }).click();
  await expect(attentionSelect).toHaveText("Meistens sichtbar");
  await expect(page.getByText("1 von 5 Bereichen beobachtet")).toBeVisible();

  await expectNoHorizontalOverflow(page);
  await expectTouchTargets(page);
  await capture(page, testInfo, "coach-weekly-review");
  expect(browserErrors).toEqual([]);
});
