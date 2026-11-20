import { expect, test } from "@playwright/test";
import { PASSWORD, USERS } from "../tests/support/seed";
import { cs, navLink, signIn } from "./support";

test("rejects a wrong password", async ({ page }) => {
  await page.goto("/");
  await page.getByPlaceholder(cs.email).fill(USERS.owner);
  await page.getByPlaceholder(cs.password).fill(`${PASSWORD}-wrong`);
  await page.getByRole("button", { name: cs.signIn }).click();
  await expect(page.getByText(/invalid login credentials/i)).toBeVisible();
  await expect(page.getByRole("navigation")).toHaveCount(0);
});

test("owner signs in, sees every section and signs out", async ({ page }) => {
  await signIn(page, "owner");
  for (const label of [cs.dashboard, cs.calendar, cs.cashdesk, cs.reports, cs.settings]) {
    await expect(navLink(page, label)).toBeVisible();
  }
  await page.getByRole("button", { name: cs.signOut }).click();
  await expect(page.getByRole("button", { name: cs.signIn })).toBeVisible();
});
