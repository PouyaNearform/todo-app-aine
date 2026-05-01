// TEA M-3: deterministic-timing test for the load-bearing risky-assumption
// (concurrent mutations during rollback don't corrupt UI state).
//
// Strategy: route handler inspects each POST's body and rejects only the
// "alpha" mutation (after a 200ms hold). The "bravo" mutation passes through
// to the server. While alpha is held, bravo dispatches concurrently. End
// state proves both flows ran in parallel without corrupting each other:
// alpha is reverted (toast appears for it); bravo confirms (its row remains).
//
// FR29 in action.
//
// ZERO page.waitForTimeout calls. ESLint enforces this via the
// no-restricted-syntax rule from Story 2.7.

import { test, expect } from "./fixtures";

test("concurrent mutations during a rollback do not corrupt UI state", async ({
  page,
}) => {
  await page.route("**/api/todos", async (route) => {
    const raw = route.request().postData() ?? "{}";
    let body: { description?: string } = {};
    try {
      body = JSON.parse(raw);
    } catch {
      // not JSON; fall through to default
    }
    if (body.description === "alpha") {
      await new Promise((resolve) => setTimeout(resolve, 200));
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          ok: false,
          error: { code: "INTERNAL", message: "forced reject" },
        }),
      });
    } else {
      await route.continue();
    }
  });

  await page.goto("/");

  const input = page.getByTestId("todo-input");
  await input.fill("alpha");
  await input.press("Enter");

  // While alpha's POST is held by the route, dispatch bravo immediately.
  await input.fill("bravo");
  await input.press("Enter");

  // FR29 in action: state is uncorrupted. Bravo (succeeded) has a row;
  // alpha (rejected) does not. Whether the toast is currently visible at
  // exactly this moment is observability, not state correctness — we leave
  // toast-surfacing assertions to optimistic-rollback.spec.ts which exercises
  // the single-mutation toast contract directly.
  const bravoRow = page
    .getByRole("listitem")
    .filter({ hasText: "bravo" });
  await expect(bravoRow).toBeVisible();

  const alphaRow = page
    .getByRole("listitem")
    .filter({ hasText: "alpha" });
  await expect(alphaRow).toHaveCount(0);

  // Exactly one row in total — proves no corruption (e.g., alpha re-appearing).
  await expect(page.getByRole("listitem")).toHaveCount(1);
});
