const BROWSER_KEY_STORAGE_KEY = "todo-app:browser-key";
const SSR_PLACEHOLDER = "";

export function getBrowserKey(): string {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return SSR_PLACEHOLDER;
  }

  const existing = window.localStorage.getItem(BROWSER_KEY_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const fresh = crypto.randomUUID();
  window.localStorage.setItem(BROWSER_KEY_STORAGE_KEY, fresh);
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
