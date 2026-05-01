import { test, expect } from "./fixtures";

test("fresh browser key shows empty state, not error", async ({ page }) => {
  await page.goto("/");

  // EmptyState present, no ErrorState.
  await expect(page.getByTestId("empty-state")).toBeVisible();
  await expect(page.getByTestId("empty-state")).toHaveText("Nothing on the list.");
  await expect(page.getByTestId("error-state")).toHaveCount(0);

  // Input is still rendered + focusable.
  await expect(page.getByTestId("todo-input")).toBeVisible();
});
