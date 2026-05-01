import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "build/",
      ".react-router/",
      "node_modules/",
      "db/migrations/",
      "coverage/",
      "**/*.config.{ts,js}",
      "vitest.setup.ts",
      "db/migrate.mjs",
    ],
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      // Underscore-prefixed args/vars are intentionally unused (e.g. _ctx in
      // ownership-check stub, _resourceOwnerId in the same).
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // App code: no console.log/info/debug. console.warn/error allowed for
    // deliberate client-side observability (the optimistic store dispatcher
    // failure paths use console.warn pre-Toast wiring; Story 1.13 onward
    // routes to Toast but the warn fallback stays as belt-and-suspenders).
    files: ["app/**/*.{ts,tsx}"],
    ignores: ["app/**/*.test.{ts,tsx}"],
    rules: {
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
  },
  {
    // E2E: forbid page.waitForTimeout — flaky-test footgun. Use page.route
    // for deterministic timing or expect().to* with auto-retry.
    files: ["e2e/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.property.name='waitForTimeout']",
          message:
            "page.waitForTimeout makes E2E tests flaky. Use page.route() for deterministic timing or expect().to* with auto-retry. (TEA amendment M-3.)",
        },
      ],
    },
  },
  {
    // Tests: relaxed (allow console; allow `any` for fixture builders).
    files: ["**/*.test.{ts,tsx}"],
    rules: {
      "no-console": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
);
