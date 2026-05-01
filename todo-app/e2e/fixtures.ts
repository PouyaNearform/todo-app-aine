// Shared Playwright helpers per TEA M-4. Provides the deterministic-timing
// primitives that keep E2E specs flake-free.

import { test as base, type Page } from "@playwright/test";

/**
 * Generates a fresh browser key (UUID v4) and seeds it into localStorage
 * before the page navigates. Each spec starts with a clean isolated key
 * so per-owner database state doesn't leak between specs.
 */
export async function freshBrowserKey(page: Page): Promise<string> {
  const key = crypto.randomUUID();
  await page.addInitScript((k) => {
    window.localStorage.setItem("todo-app:browser-key", k);
  }, key);
  return key;
}

/**
 * Forces the next request to the matching URL pattern to fail with the given
 * status + envelope. Use for testing the optimistic-rollback path.
 *
 * Use ONCE per test to avoid affecting subsequent tests' requests.
 */
export async function forceBackendRejection(
  page: Page,
  urlPattern: string | RegExp,
  status = 500,
  body: unknown = { ok: false, error: { code: "INTERNAL", message: "forced" } },
): Promise<void> {
  await page.route(
    urlPattern,
    async (route) => {
      await route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    },
    { times: 1 },
  );
}

/**
 * Injects a deterministic latency on requests matching the URL pattern.
 * Use for testing concurrent-mutation scenarios where one request is
 * intentionally slow.
 */
export async function injectLatency(
  page: Page,
  urlPattern: string | RegExp,
  latencyMs: number,
): Promise<void> {
  await page.route(urlPattern, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, latencyMs));
    await route.continue();
  });
}

/**
 * Statistical assertion: sample N values, assert that the p95 is within the
 * threshold. Single-shot timing assertions are forbidden by TEA M-5 — they're
 * flaky on CI runners with variable load.
 */
export function statisticalAssert(
  samples: number[],
  percentile: number,
  thresholdMs: number,
  metricLabel: string,
): void {
  const sorted = [...samples].sort((a, b) => a - b);
  const idx = Math.ceil((percentile / 100) * sorted.length) - 1;
  const value = sorted[Math.max(0, idx)];
  if (value > thresholdMs) {
    throw new Error(
      `${metricLabel}: p${percentile} = ${value}ms exceeds threshold ${thresholdMs}ms (samples: ${JSON.stringify(sorted)})`,
    );
  }
}

/**
 * Custom test fixture that pre-seeds a fresh browser key for every test.
 * Tests can use the imported `test` directly + access `browserKey` from
 * the fixture context.
 */
export const test = base.extend<{ browserKey: string }>({
  browserKey: async ({ page }, use) => {
    const key = await freshBrowserKey(page);
    await use(key);
  },
});

export { expect } from "@playwright/test";
