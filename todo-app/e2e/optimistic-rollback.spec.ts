import { test, expect } from "./fixtures";

test("backend rejection triggers UI revert + Toast with payload-preserving Retry", async ({
  page,
}) => {
  await page.goto("/");

  // Force the next POST /api/todos to fail with a small latency so the
  // optimistic row stays visible long enough for the mid-flight assertion.
  await page.route(
    "**/api/todos",
    async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 150));
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          ok: false,
          error: { code: "INTERNAL", message: "forced" },
        }),
      });
    },
    { times: 1 },
  );

  await page.getByTestId("todo-input").fill("doomed first attempt");
  await page.getByTestId("todo-input").press("Enter");

  // Optimistic row appears immediately (filter by <li> so we don't match
  // the eventual toast's body text which also includes the description).
  const row = page
    .getByRole("listitem")
    .filter({ hasText: "doomed first attempt" });
  await expect(row).toBeVisible();

  // …then reverts after the rejected fetch resolves; Toast appears.
  await expect(page.getByTestId("toast")).toBeVisible();
  const toast = page.getByTestId("toast");
  await expect(toast).toContainText("Couldn't save");
  await expect(toast).toContainText("doomed first attempt");

  // The optimistic row is gone after revert.
  await expect(row).toHaveCount(0);

  // Click Retry — second attempt goes through (we only rejected the first).
  await page.getByTestId("toast-retry").click();
  await expect(row).toBeVisible();

  // Toast auto-dismisses on Retry click (Story 1.13 contract).
  await expect(page.getByTestId("toast")).toHaveCount(0);
});
