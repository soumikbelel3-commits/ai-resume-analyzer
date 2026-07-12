/**
 * E2E scaffold — install Playwright when ready:
 *   npx playwright install
 *   npx playwright test
 *
 * These tests assume `npm run dev` is running on localhost:3000.
 */
import { test, expect } from "@playwright/test";

test.describe("AI Resume Analyzer smoke", () => {
  test("home page renders", async ({ page }) => {
    await page.goto("http://localhost:3000");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Improve resumes",
    );
  });

  test("dashboard loads", async ({ page }) => {
    await page.goto("http://localhost:3000/dashboard");
    await expect(
      page.getByRole("heading", { name: "Dashboard" }),
    ).toBeVisible();
  });
});
