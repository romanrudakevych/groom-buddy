import { expect, test } from "@playwright/test";
import { authFile, cs, field } from "./support";

test.use({ storageState: authFile("owner") });

test("creates a client together with a new dog", async ({ page }) => {
  const stamp = Date.now();
  const clientName = `E2E Klient ${stamp}`;
  const dogName = `Bobík ${stamp}`;

  await page.goto("/klienti");
  await page.getByRole("button", { name: cs.newClient }).click();
  const dialog = page.getByRole("dialog");
  await field(dialog, cs.name).fill(clientName);
  await dialog.getByRole("button", { name: cs.addDog }).click();
  await field(dialog, cs.dogName).fill(dogName);
  await dialog.getByRole("button", { name: cs.save }).click();

  await expect(page.getByText(cs.clientCreated)).toBeVisible();
  await expect(dialog).toBeHidden();
  const row = page.getByRole("row").filter({ hasText: clientName });
  await expect(row).toContainText(dogName);

  await row.getByRole("link", { name: clientName }).click();
  await expect(page).toHaveURL(/\/klienti\/[0-9a-f-]+$/);
  await expect(page.getByText(dogName).first()).toBeVisible();
});
