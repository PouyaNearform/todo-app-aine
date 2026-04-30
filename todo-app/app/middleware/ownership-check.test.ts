// @vitest-environment node

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { buildRequestContext } from "./request-context";
import { checkOwnership } from "./ownership-check";

function makeCtx(browserKey = "11111111-2222-4333-8444-555555555555") {
  return buildRequestContext(
    new Request("http://localhost/", {
      headers: { "X-Browser-Key": browserKey },
    }),
  );
}

describe("checkOwnership (v1 no-op contract)", () => {
  it("returns void when ctx.ownerId matches resourceOwnerId", () => {
    const ctx = makeCtx();
    const result = checkOwnership(ctx, ctx.ownerId);
    expect(result).toBeUndefined();
  });

  // NOTE: this test passes today because v1 is a no-op. When auth lands, it
  // becomes the canonical "rejects mismatched owner" test — the assertion will
  // flip to expect a thrown UnauthorizedError/ForbiddenError.
  it("returns void when ctx.ownerId differs from resourceOwnerId (v1 contract)", () => {
    const ctx = makeCtx();
    expect(() =>
      checkOwnership(ctx, "99999999-aaaa-4bbb-8ccc-dddddddddddd"),
    ).not.toThrow();
  });

  it("returns void when resourceOwnerId is null (create-style call site)", () => {
    const ctx = makeCtx();
    expect(() => checkOwnership(ctx, null)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Test 1.6-UNIT-001 (TEA amendment m-2): seam-invocation discipline.
// Scans every route file's action handler and asserts checkOwnership(...) is
// invoked. Today there are zero actions, so the test is trivially green; when
// Stories 1.10–1.12 introduce actions, this test starts enforcing the rule.
// ---------------------------------------------------------------------------

function listFilesRecursively(dir: string, files: string[] = []): string[] {
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      listFilesRecursively(full, files);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

const ACTION_DECL_REGEX =
  /(?:export\s+(?:async\s+)?function\s+action\s*\(|export\s+const\s+action\s*=)/;

describe("Test 1.6-UNIT-001: checkOwnership invocation discipline", () => {
  const routesDir = join(process.cwd(), "app", "routes");
  const files = listFilesRecursively(routesDir);

  it("every action handler in app/routes/ references checkOwnership(", () => {
    const actionFiles = files.filter((f) => {
      const content = readFileSync(f, "utf8");
      return ACTION_DECL_REGEX.test(content);
    });

    const violators: string[] = [];
    for (const file of actionFiles) {
      const content = readFileSync(file, "utf8");
      if (!content.includes("checkOwnership(")) {
        violators.push(file);
      }
    }

    expect(violators).toEqual([]);

    if (actionFiles.length === 0) {
      // Story 1.6 ships before any action handlers exist — log a heads-up
      // so the trainee knows the test is currently trivially green.
      console.info(
        `[Test 1.6-UNIT-001] No action handlers scanned yet (Stories 1.10+ introduce them).`,
      );
    }
  });
});
