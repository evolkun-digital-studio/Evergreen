import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

// Signed-in steps use real accounts in the configured database:
//   E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD    an ADMIN (or EDITOR)
//   E2E_VIEWER_EMAIL / E2E_VIEWER_PASSWORD  a VIEWER (create one in Admin → Users)
// They are skipped when the variables are not set. The upload test deletes its document afterwards.
const admin = { email: process.env.E2E_ADMIN_EMAIL, password: process.env.E2E_ADMIN_PASSWORD };
const viewer = { email: process.env.E2E_VIEWER_EMAIL, password: process.env.E2E_VIEWER_PASSWORD };
const FIXTURE = path.resolve("tests/e2e/fixtures/e2e-certificate.pdf");
const FAKE_ID = "65f000000000000000000000";

const testRows = (page: Page) => page.getByRole("row").filter({ hasText: /e2e certificate/i });

async function signIn(page: Page, who: { email?: string; password?: string }) {
  await page.goto("/documents/login");
  await page.getByLabel("Email").fill(who.email!);
  await page.getByLabel("Password").fill(who.password!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/documents\/library$/);
}

test.describe("logged out", () => {
  test("/documents is the public request form and leaks nothing", async ({ page }) => {
    const res = await page.goto("/documents");
    await expect(page).toHaveURL(/\/documents$/);
    await expect(page.getByRole("heading", { name: "Request document access" })).toBeVisible();
    expect(res?.headers()["x-robots-tag"]).toContain("noindex");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.getByRole("link", { name: "Download" })).toHaveCount(0);
  });

  test("the staff library still needs a sign-in", async ({ page }) => {
    await page.goto("/documents/library");
    await expect(page).toHaveURL(/\/documents\/login\?next=%2Fdocuments%2Flibrary/);
    await expect(page.getByRole("heading", { name: "Document access" })).toBeVisible();
  });

  test("submitting the form shows the confirmation message", async ({ page }) => {
    await page.goto("/documents");
    await page.waitForLoadState("networkidle"); // the submit handler exists only after hydration
    await page.getByLabel("Your name").fill("E2E Requester");
    await page.getByLabel("Email", { exact: true }).fill(`e2e-${Date.now()}@example.com`);
    await page.getByLabel("Reason").fill("Automated end-to-end check of the request form.");
    await page.getByRole("button", { name: "Send request" }).click();
    await expect(page.getByText("Thanks. Admin will respond to you very soon by email.")).toBeVisible({ timeout: 20_000 });
  });

  test("an unknown or malformed emailed link goes back to the request page", async ({ page }) => {
    for (const token of ["65f000000000000000000000.nope", "garbage"]) {
      await page.goto(`/documents/access/${token}`);
      await expect(page).toHaveURL(/\/documents\?link=invalid$/);
      await expect(page.getByText("This link is no longer valid. You can request access again.")).toBeVisible();
    }
  });

  test("file route returns 401", async ({ request }) => {
    const res = await request.get(`/api/documents/${FAKE_ID}/file`);
    expect(res.status()).toBe(401);
    expect(res.headers()["cache-control"]).toContain("no-store");
  });

  test("guessed /public and /uploads paths return 404", async ({ request }) => {
    for (const guess of ["/documents/e2e-certificate.pdf", "/e2e-certificate.pdf", "/uploads/documents/e2e-certificate.pdf", "/storage/private/documents/x.pdf"]) {
      const res = await request.get(guess, { maxRedirects: 0 });
      // /documents/* bounces to the login (307); everything else must not exist.
      expect([307, 404]).toContain(res.status());
      expect(res.headers()["content-type"] ?? "").not.toContain("application/pdf");
    }
  });

  test("robots.txt blocks the library", async ({ request }) => {
    const body = await (await request.get("/robots.txt")).text();
    expect(body).toMatch(/^Disallow: \/documents$/m);
    expect(body).toMatch(/^Disallow: \/api\/documents$/m);
    expect(await (await request.get("/sitemaps/pages.xml")).text()).not.toContain("/documents");
  });
});

test.describe("signed in", () => {
  test("admin uploads a PDF; it appears on /documents/library; view and download work; sign out locks it again", async ({ page }) => {
    test.skip(!admin.email || !admin.password, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set");
    await signIn(page, admin);

    await page.goto("/admin/documents");
    await page.waitForLoadState("networkidle"); // the file input's handler exists only after hydration
    await page.getByTestId("document-upload").setInputFiles(FIXTURE);
    await expect(testRows(page).first()).toBeVisible({ timeout: 20_000 });

    await page.goto("/documents/library");
    const item = page.getByRole("listitem").filter({ hasText: /e2e certificate/i }).first();
    await expect(item).toBeVisible();
    const fileHref = await item.getByRole("link", { name: "View" }).getAttribute("href");
    expect(fileHref).toMatch(/^\/api\/documents\/[a-f0-9]{24}\/file$/);

    const view = await page.request.get(fileHref!);
    expect(view.status()).toBe(200);
    expect(view.headers()["content-type"]).toBe("application/pdf");
    expect(view.headers()["content-disposition"]).toMatch(/^inline;/);
    expect(view.headers()["cache-control"]).toBe("private, no-store");
    expect(view.headers()["x-robots-tag"]).toContain("noindex");

    const download = await page.request.get(`${fileHref}?download=1`);
    expect(download.status()).toBe(200);
    expect(download.headers()["content-disposition"]).toMatch(/^attachment;/);

    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL(/\/documents\/login/);
    expect((await page.request.get(fileHref!)).status()).toBe(401);

    // Clean up the test document.
    await signIn(page, admin);
    await page.goto("/admin/documents");
    await page.waitForLoadState("networkidle");
    while ((await testRows(page).count()) > 0) {
      const before = await testRows(page).count();
      await testRows(page).first().getByRole("button", { name: "Delete" }).click();
      await page.getByRole("button", { name: "Confirm" }).click();
      await expect(testRows(page)).toHaveCount(before - 1);
    }
  });

  test("viewer sees documents but is kept out of /admin", async ({ page }) => {
    test.skip(!viewer.email || !viewer.password, "E2E_VIEWER_EMAIL / E2E_VIEWER_PASSWORD not set");
    await signIn(page, viewer);
    await expect(page.getByRole("heading", { name: "Documents", level: 1 })).toBeVisible();
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/documents\/library$/);
    await page.goto("/admin/documents");
    await expect(page).toHaveURL(/\/documents\/library$/);
  });
});
