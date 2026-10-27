import { expect, test } from "@playwright/test";

const targetTile = (page: import("@playwright/test").Page) =>
  page.getByText("Estimated recycling target (kg)").locator("xpath=..");

test.describe("EPR calculator", () => {
  test("started 2025-26, reference 2024-25: not applicable, every figure 0", async ({ page }) => {
    await page.goto("/epr-calculator?fy=2026-27&eee=CEEW4&start=2025-26");
    await expect(page.getByRole("textbox", { name: "Sales in 2024-25 (kg)" })).toHaveCount(0);
    await expect(page.getByRole("note", { name: "Sales in 2024-25 (kg)" })).toHaveText("Not applicable");
    await expect(page.getByText("No sales in 2024-25 because operations started in 2025-26.", { exact: true })).toBeVisible();
    await expect(targetTile(page)).toContainText("0");
    await page.getByText("How this was calculated").click();
    await expect(page.getByText("Recycling target = 0 kg × 20% = 0 kg.")).toBeVisible();
  });

  test("moving the start year earlier enables the reference year immediately", async ({ page }) => {
    await page.goto("/epr-calculator?fy=2026-27&eee=CEEW4&start=2025-26");
    // Wait for the link's inputs to be restored before changing one.
    await expect(page.getByRole("note", { name: "Sales in 2024-25 (kg)" })).toBeVisible();
    await page.getByLabel("Sales started in").selectOption("2024-25");
    const sales = page.getByRole("textbox", { name: "Sales in 2024-25 (kg)" });
    await expect(sales).toBeEditable();
    await sales.fill("1000");
    await expect(targetTile(page)).toContainText("200");
  });

  test("filing 2027-28 moves the reference to 2025-26, editable; values stay with their own year", async ({ page }) => {
    await page.goto("/epr-calculator?fy=2026-27&eee=CEEW4&start=2024-25");
    await page.getByRole("textbox", { name: "Sales in 2024-25 (kg)" }).fill("1000");
    await expect(targetTile(page)).toContainText("200");

    await page.getByLabel("E-waste annual filing year").selectOption("2027-28");
    const ref = page.getByRole("textbox", { name: "Sales in 2025-26 (kg)" });
    await expect(ref).toBeEditable();
    await expect(ref).toHaveValue("");
    // The 2024-25 figure is kept in its own row, not moved to 2025-26 and not used.
    await expect(page.getByRole("textbox", { name: "Sales in 2024-25 (kg)" })).toHaveValue("1000");
    await expect(page.getByText("Saved for 2024-25. Not used for this filing year.")).toBeVisible();
    await expect(targetTile(page)).not.toContainText("200");

    await ref.fill("500");
    await expect(targetTile(page)).toContainText("100");
    await page.getByLabel("E-waste annual filing year").selectOption("2026-27");
    await expect(targetTile(page)).toContainText("200");
  });

  test("empty quantity is neutral; typing a valid number updates the cards at once", async ({ page }) => {
    await page.goto("/epr-calculator?fy=2026-27&eee=CEEW4&start=2020-21");
    const sales = page.getByRole("textbox", { name: "Sales in 2024-25 (kg)" });
    await expect(sales).toBeEditable();
    await sales.focus();
    await sales.blur();
    await expect(page.getByText("Enter quantity to calculate.", { exact: true })).toBeVisible();
    await expect(page.getByText("Enter a quantity of 0 or more.")).toHaveCount(0);
    await expect(sales).not.toHaveAttribute("aria-invalid", "true");
    await expect(targetTile(page)).toContainText("—");

    await sales.fill("0");
    await expect(targetTile(page)).toContainText("0");
    await sales.fill("-3");
    await expect(page.getByText("Quantity can't be negative.")).toBeVisible();
    await sales.fill("1250.5");
    await expect(targetTile(page)).toContainText("250.1");
  });

  test("importer of used EEE: own section and label, no reference-year badge", async ({ page }) => {
    await page.goto("/epr-calculator?fy=2026-27&eee=ITEW3&start=2010-11&sales=2026-27:999");
    // Wait for the link's inputs to be restored before changing one.
    await expect(page.getByRole("textbox", { name: "Sales in 2026-27 (kg)" })).toHaveValue("999");
    await page.getByLabel("Producer type").selectOption("used-importer");
    await expect(page.getByText("Used EEE import details", { exact: true })).toBeVisible();
    await expect(page.getByText("Sales history")).toHaveCount(0);
    await expect(page.getByText("Reference year", { exact: true })).toHaveCount(0);
    const used = page.getByRole("textbox", { name: "Used EEE reaching end of life in FY 2026-27 (kg)" });
    // The new-EEE sales figure for 2026-27 is not carried over.
    await expect(used).toHaveValue("");
    await used.fill("40");
    await expect(targetTile(page)).toContainText("40");
  });

  test.describe("PDF report", () => {
    async function pdfText(page: import("@playwright/test").Page) {
      const download = page.waitForEvent("download");
      await page.getByRole("button", { name: "Download PDF" }).click();
      const file = await (await download).path();
      const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const { readFileSync } = await import("node:fs");
      const doc = await getDocument({ data: new Uint8Array(readFileSync(file)), verbosity: 0 }).promise;
      let text = "";
      for (let i = 1; i <= doc.numPages; i++) text += (await (await doc.getPage(i)).getTextContent()).items.map(x => ("str" in x ? x.str : "")).join(" ") + " ";
      return { name: (await download).suggestedFilename(), text: text.replace(/\s+/g, " ") };
    }

    test("used EEE importer: same inputs and result as the page, end-of-life wording, provision and formula", async ({ page }) => {
      await page.goto("/epr-calculator?fy=2027-28&type=used&eee=ITEW1-minicomputers&used=2027-28:40");
      await expect(targetTile(page)).toContainText("40");
      await expect(page.getByText("End-of-life assessment year", { exact: true })).toBeVisible();
      const { name, text } = await pdfText(page);
      expect(name).toBe("epr-estimate-ITEW1-minicomputers-2027-28.pdf");
      expect(text).toContain("Importer of used EEE");
      expect(text).toContain("Subcategory Minicomputers");
      expect(text).toContain("End-of-life assessment year 2027-28");
      expect(text).toContain("Estimated recycling target 40 kg");
      expect(text).toContain("Schedule III, note (2)");
      expect(text).toContain("not re-exported × 100%");
      expect(text).not.toContain("Reference sales year");
    });

    test("ITEW1 Mainframes: subcategory and its 10-year life in the PDF", async ({ page }) => {
      await page.goto("/epr-calculator?fy=2026-27&eee=ITEW1-mainframes&start=2000-01&sales=2016-17:100");
      await expect(targetTile(page)).toContainText("70");
      const { text } = await pdfText(page);
      expect(text).toContain("EEE code ITEW1");
      expect(text).toContain("Subcategory Mainframes");
      expect(text).toContain("10 (Mainframes)");
      expect(text).toContain("EEE placed on the market in 2016-17 100 kg");
      expect(text).toContain("Estimated recycling target 70 kg");
      expect(text).toContain("EEE placed on the market in 2016-17 (Y - X) × 70%");
      expect(text).toContain("27 >= average life 10, so Schedule III applies");
    });
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
