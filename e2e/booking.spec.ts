import { expect, test } from "@playwright/test";
import { adminClient, NAMES, seed } from "../tests/support/seed";
import { authFile, cs, field, fieldBox } from "./support";

test.use({ storageState: authFile("owner") });

test("books a visit from the calendar", async ({ page }) => {
  const s = await seed();
  const db = adminClient();
  const before = (
    await db.from("appointments").select("id").eq("dog_id", s.dogId).eq("status", "Naplánováno")
  ).data!.length;

  await page.goto("/kalendar");
  await page.getByRole("button", { name: cs.newVisit }).click();
  const dialog = page.getByRole("dialog");

  await dialog.getByRole("combobox").filter({ hasText: cs.pickDog }).click();
  await page.getByPlaceholder(cs.searchDog).fill(NAMES.dog);
  await page.getByRole("option", { name: NAMES.dog, exact: true }).click();

  await field(dialog, cs.groomerDeterminesSalon).selectOption({
    label: `${NAMES.groomer} – ${s.salonName}`,
  });
  await fieldBox(dialog, cs.services).getByRole("checkbox").first().click();
  // SlotPicker preselects the first working day; take its first free time.
  await dialog
    .getByRole("button", { name: /^(⭐ )?\d\d:\d\d$/ })
    .first()
    .click();
  await dialog.getByRole("button", { name: cs.save }).click();

  await expect(page.getByText(cs.visitCreated)).toBeVisible();
  const after = (
    await db
      .from("appointments")
      .select("id, groomer_id")
      .eq("dog_id", s.dogId)
      .eq("status", "Naplánováno")
  ).data!;
  expect(after).toHaveLength(before + 1);
  expect(after.some((a) => a.groomer_id === s.groomerId)).toBe(true);
});
