import "@testing-library/jest-dom/vitest";

// jsdom doesn't ship matchMedia. TextInput uses it for desktop-only auto-focus.
// Default matches=false so tests behave as if on mobile (no auto-focus side effect).
if (typeof window !== "undefined" && typeof window.matchMedia === "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}
