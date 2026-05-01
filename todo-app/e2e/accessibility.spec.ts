import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "./fixtures";

test("axe: zero violations on Empty state", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("empty-state")).toBeVisible();
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

test("axe: zero violations on Default state with todos", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("todo-input").fill("axe coverage");
  await page.getByTestId("todo-input").press("Enter");
  await expect(page.getByText("axe coverage")).toBeVisible();
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

test("keyboard-only walkthrough completes all four verbs without mouse", async ({
  page,
}) => {
  await page.goto("/");
  // Story 1.10's auto-focus uses matchMedia + a useEffect; under Playwright's
  // synchronous boot the focus may not have settled yet. Wait for the input
  // to be ready, then explicitly focus to avoid timing flakiness.
  const input = page.getByTestId("todo-input");
  await expect(input).toBeVisible();
  await input.focus();
  await input.press("k");
  await page.keyboard.type("eyboard-add");
  await page.keyboard.press("Enter");
  await expect(page.getByText("keyboard-add")).toBeVisible();

  // Tab → Checkbox → Space toggles complete.
  await page.keyboard.press("Tab");
  await page.keyboard.press("Space");
  const item = page.getByRole("listitem").filter({ hasText: "keyboard-add" });
  await expect(item).toHaveAttribute("data-completed", "true");

  // Space again toggles back.
  await page.keyboard.press("Space");
  await expect(item).toHaveAttribute("data-completed", "false");

  // Tab → Delete button → Enter activates.
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(page.getByText("keyboard-add")).toHaveCount(0);
});
