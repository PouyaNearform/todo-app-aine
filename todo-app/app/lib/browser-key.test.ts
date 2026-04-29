import { browserKeyFetch, getBrowserKey } from "./browser-key";

const STORAGE_KEY = "todo-app:browser-key";
const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("getBrowserKey", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("generates and persists a UUID on first call", () => {
    const key = getBrowserKey();
    expect(key).toMatch(UUID_V4_REGEX);
    expect(localStorage.getItem(STORAGE_KEY)).toBe(key);
  });

  it("returns the same value on subsequent calls within a session", () => {
    const a = getBrowserKey();
    const b = getBrowserKey();
    expect(a).toBe(b);
  });

  it("returns an existing localStorage value if one is present", () => {
    const preset = "11111111-2222-4333-8444-555555555555";
    localStorage.setItem(STORAGE_KEY, preset);
    expect(getBrowserKey()).toBe(preset);
  });

  it("returns the SSR placeholder when window is undefined", () => {
    vi.stubGlobal("window", undefined);
    expect(getBrowserKey()).toBe("");
  });
});

describe("browserKeyFetch", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    fetchMock = vi.fn(() => Promise.resolve(new Response("")));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function lastCallHeaders(): Headers {
    const call = fetchMock.mock.calls.at(-1);
    if (!call) throw new Error("fetch was not called");
    const init = call[1] as RequestInit | undefined;
    return new Headers(init?.headers);
  }

  it("injects X-Browser-Key on every request", async () => {
    await browserKeyFetch("/api/todos");
    const headers = lastCallHeaders();
    expect(headers.get("X-Browser-Key")).toMatch(UUID_V4_REGEX);
  });

  it("preserves caller-supplied headers", async () => {
    await browserKeyFetch("/api/todos", {
      headers: { "Content-Type": "application/json" },
    });
    const headers = lastCallHeaders();
    expect(headers.get("X-Browser-Key")).toMatch(UUID_V4_REGEX);
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("preserves method and body", async () => {
    await browserKeyFetch("/api/todos", {
      method: "POST",
      body: '{"x":1}',
    });
    const init = fetchMock.mock.calls.at(-1)?.[1] as RequestInit;
    expect(init.method).toBe("POST");
    expect(init.body).toBe('{"x":1}');
  });

  it("uses the same UUID across sequential requests", async () => {
    await browserKeyFetch("/api/todos");
    await browserKeyFetch("/api/todos");
    const first = fetchMock.mock.calls[0][1] as RequestInit;
    const second = fetchMock.mock.calls[1][1] as RequestInit;
    const firstKey = new Headers(first.headers).get("X-Browser-Key");
    const secondKey = new Headers(second.headers).get("X-Browser-Key");
    expect(firstKey).toBe(secondKey);
    expect(firstKey).toMatch(UUID_V4_REGEX);
  });
});
