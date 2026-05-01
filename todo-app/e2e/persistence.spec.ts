import { test, expect } from "./fixtures";

test("persists across page refresh", async ({ page }) => {
  await page.goto("/");

  // Submit + wait for the server to confirm the create before reloading.
  // Without this wait, the in-flight POST can be aborted by the navigation.
  const responsePromise = page.waitForResponse(
    (resp) => resp.url().includes("/api/todos") && resp.status() === 201,
  );
  await page.getByTestId("todo-input").fill("read a book");
  await page.getByTestId("todo-input").press("Enter");
  await responsePromise;

  await expect(page.getByText("read a book")).toBeVisible();

  // Refresh — browser key persists in localStorage; row was committed.
  await page.reload();

  await expect(page.getByText("read a book")).toBeVisible();
});

test("persists when the tab is closed and reopened in the same context", async ({
  page,
  context,
}) => {
  // Use the fixture's page (which already has the fresh browser key seeded
  // via addInitScript). Add a todo + wait for server confirm.
  await page.goto("/");
  const confirmed = page.waitForResponse(
    (resp) => resp.url().includes("/api/todos") && resp.status() === 201,
  );
  await page.getByTestId("todo-input").fill("close + reopen survives");
  await page.getByTestId("todo-input").press("Enter");
  await confirmed;
  await expect(
    page.getByRole("listitem").filter({ hasText: "close + reopen survives" }),
  ).toBeVisible();

  // Open a new tab in the SAME context — cookies + localStorage are shared,
  // mirroring a "close tab + open new tab" flow.
  const page2 = await context.newPage();
  await page2.goto("/");
  await expect(
    page2.getByRole("listitem").filter({ hasText: "close + reopen survives" }),
  ).toBeVisible();
});
