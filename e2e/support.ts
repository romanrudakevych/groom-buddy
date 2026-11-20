import { expect, type Locator, type Page } from "@playwright/test";
import { strings } from "../src/lib/i18n";
import { PASSWORD, USERS, type TestRole } from "../tests/support/seed";

/** Czech UI strings: the app's default language. */
export const cs = strings.cs;

export const authFile = (role: TestRole) => `e2e/.auth/${role}.json`;

/** The `Field` wrapper with this label (labels are not linked to their inputs). */
export function fieldBox(scope: Page | Locator, label: string): Locator {
  const exact = new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}( \\*)?$`);
  return scope
    .locator("div.space-y-1")
    .filter({ has: scope.locator("label").filter({ hasText: exact }) })
    .first();
}

/** The input, select or textarea under a form label. */
export const field = (scope: Page | Locator, label: string): Locator =>
  fieldBox(scope, label).locator("input, select, textarea").first();

export async function signIn(page: Page, role: TestRole) {
  await page.goto("/");
  await page.getByPlaceholder(cs.email).fill(USERS[role]);
  await page.getByPlaceholder(cs.password).fill(PASSWORD);
  await page.getByRole("button", { name: cs.signIn }).click();
  await expect(page.getByRole("navigation")).toBeVisible();
}

export const navLink = (page: Page, label: string) =>
  page.getByRole("navigation").getByRole("link", { name: new RegExp(label) });
