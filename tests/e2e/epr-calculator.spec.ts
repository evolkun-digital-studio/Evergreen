import { expect, test } from "@playwright/test";

const targetTile = (page: import("@playwright/test").Page) =>
  page.getByText("Estimated recycling target (kg)").locator("xpath=..");

test.describe("EPR calculator", () => {
  test("sales starting after the reference year: field disabled, every figure 0", async ({ page }) => {
    await page.goto("/epr-calculator?fy=2026-27&eee=CEEW4&start=2026-27&kg=1000");
    const quantity = page.getByLabel("Sales in 2024-25 (kg)");
    await expect(quantity).toBeDisabled();
    await expect(quantity).toHaveValue("");
    await expect(page.getByText("No sales recorded for this financial year.", { exact: true })).toBeVisible();
    await expect(targetTile(page)).toContainText("0");
    await expect(targetTile(page)).not.toContainText("200");
    await page.getByText("How this was calculated").click();
    await expect(page.getByText("Recycling target = 0 kg × 20% = 0 kg.")).toBeVisible();
  });

  test("a quantity typed for one year is not carried to another", async ({ page }) => {
    await page.goto("/epr-calculator?fy=2025-26&eee=CEEW4&start=2020-21");
    await page.getByLabel("Sales in 2023-24 (kg)").fill("1000");
    await expect(targetTile(page)).toContainText("200");
    await page.getByLabel("E-waste annual filing year").selectOption("2026-27");
    await expect(page.getByLabel("Sales in 2024-25 (kg)")).toHaveValue("");
    await page.getByLabel("E-waste annual filing year").selectOption("2025-26");
    await expect(page.getByLabel("Sales in 2023-24 (kg)")).toHaveValue("1000");
  });

  test.describe("mobile", () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

    test("EEE picker searches by code and stays inside the viewport", async ({ page }) => {
      await page.goto("/epr-calculator");
      const trigger = page.getByRole("combobox", { name: /Electrical and electronic equipment/ });
      await trigger.scrollIntoViewIfNeeded();
      await trigger.tap();
      const search = page.getByRole("combobox", { name: "Search EEE items" });
      await search.fill("ITEW1");
      await expect(page.getByRole("option", { name: /Mainframes$/ })).toBeVisible();
      await expect(page.getByRole("option", { name: /Minicomputers$/ })).toBeVisible();

      const box = await page.locator('[data-slot="popover-content"]').boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(390);
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.y + box!.height).toBeLessThanOrEqual(844);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);

      await page.getByRole("option", { name: /Minicomputers$/ }).tap();
      await expect(search).toBeHidden();
      await expect(trigger).toContainText("ITEW1 — Minicomputers");
    });
  });
});
