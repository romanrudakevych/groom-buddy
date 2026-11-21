import { expect, test } from "@playwright/test";
import { authFile, cs, navLink } from "./support";

test.describe("admin", () => {
  test.use({ storageState: authFile("admin") });

  test("has no cash, reports, logs or settings", async ({ page }) => {
    await page.goto("/");
    await expect(navLink(page, cs.calendar)).toBeVisible();
    for (const label of [cs.cashdesk, cs.reports, cs.auditLogs, cs.settings]) {
      await expect(navLink(page, label)).toHaveCount(0);
    }
  });

  for (const path of ["/kassa", "/reporty", "/logs"]) {
    test(`is blocked from ${path} by direct link`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByText(cs.noAccess)).toBeVisible();
    });
  }
});

test.describe("groomer", () => {
  test.use({ storageState: authFile("groomer") });

  test("sees their calendar and dogs only", async ({ page }) => {
    await page.goto("/kalendar");
    await expect(navLink(page, cs.myDogs)).toBeVisible();
    for (const label of [cs.dashboard, cs.cashdesk, cs.templates, cs.settings]) {
      await expect(navLink(page, label)).toHaveCount(0);
    }
  });

  test("is blocked from the dashboard", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(cs.noAccess)).toBeVisible();
  });
});
