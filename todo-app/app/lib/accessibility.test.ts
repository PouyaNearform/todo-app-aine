// @vitest-environment node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("accessibility: prefers-reduced-motion floors", () => {
  it("global.css honors prefers-reduced-motion with universal animation+transition reset", () => {
    const css = readFileSync(
      resolve(process.cwd(), "app/styles/global.css"),
      "utf8",
    );
    expect(css).toMatch(/prefers-reduced-motion:\s*reduce/);
    expect(css).toMatch(/animation-duration:\s*0ms\s*!important/);
    expect(css).toMatch(/transition-duration:\s*0ms\s*!important/);
  });

  it("Toast.module.css overrides its keyframe slide-in under prefers-reduced-motion", () => {
    const css = readFileSync(
      resolve(process.cwd(), "app/components/Toast.module.css"),
      "utf8",
    );
    expect(css).toMatch(/prefers-reduced-motion:\s*reduce/);
    expect(css).toMatch(/animation:\s*none/);
  });
});

describe("accessibility: ListItem inverted-block focus", () => {
  it("ListItem.module.css uses :focus-within with CSS-variable inversion", () => {
    const css = readFileSync(
      resolve(process.cwd(), "app/components/ListItem.module.css"),
      "utf8",
    );
    expect(css).toMatch(/\.item:focus-within/);
    // Background swap is the visible inversion cue.
    expect(css).toMatch(/background:\s*var\(--color-accent\)/);
    // Variable overrides cascade to Checkbox + delete glyph.
    expect(css).toMatch(/--color-fg:\s*var\(--color-accent-fg\)/);
    expect(css).toMatch(/--color-border:\s*var\(--color-accent-fg\)/);
  });
});
