const BROWSER_KEY_STORAGE_KEY = "todo-app:browser-key";
const BROWSER_KEY_COOKIE = "todo-app-browser-key";
const SSR_PLACEHOLDER = "";
const TEN_YEARS_SECONDS = 10 * 365 * 24 * 60 * 60;

function ensureCookie(key: string): void {
  if (typeof document === "undefined") return;
  // Idempotent — re-setting a cookie with the same value just refreshes max-age.
  document.cookie = `${BROWSER_KEY_COOKIE}=${key}; path=/; max-age=${TEN_YEARS_SECONDS}; SameSite=Strict`;
}

export function getBrowserKey(): string {
  if (
    typeof window === "undefined" ||
    typeof window.localStorage === "undefined"
  ) {
    return SSR_PLACEHOLDER;
  }

  const existing = window.localStorage.getItem(BROWSER_KEY_STORAGE_KEY);
  if (existing) {
    ensureCookie(existing);
    return existing;
  }

  const fresh = crypto.randomUUID();
  window.localStorage.setItem(BROWSER_KEY_STORAGE_KEY, fresh);
  ensureCookie(fresh);
  return fresh;
}

export function browserKeyFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const headers = new Headers(init?.headers);
  headers.set("X-Browser-Key", getBrowserKey());
  return fetch(input, { ...init, headers });
}
