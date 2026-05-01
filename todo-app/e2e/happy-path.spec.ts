import { test, expect } from "./fixtures";

test("add → see → complete → uncomplete → delete", async ({ page }) => {
  await page.goto("/");

  const input = page.getByTestId("todo-input");
  await expect(input).toBeVisible();

  // Add
  await input.fill("buy milk");
  await input.press("Enter");
  const item = page.getByText("buy milk").first();
  await expect(item).toBeVisible();

  // See — input cleared, focus retained
  await expect(input).toHaveValue("");

  // Complete (toggle the checkbox)
  const checkbox = page.getByLabel("Toggle: buy milk");
  await checkbox.click();
  const li = page.getByRole("listitem").filter({ hasText: "buy milk" });
  await expect(li).toHaveAttribute("data-completed", "true");

  // Uncomplete
  await checkbox.click();
  await expect(li).toHaveAttribute("data-completed", "false");

  // Delete
  const deleteBtn = page.getByLabel("Delete: buy milk");
  await deleteBtn.click();
  await expect(li).toHaveCount(0);

  // Empty state returns
  await expect(page.getByTestId("empty-state")).toBeVisible();
});
