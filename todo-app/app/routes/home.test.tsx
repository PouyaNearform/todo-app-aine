// The route's loader transitively imports db/client, which throws on missing
// DATABASE_URL at module load. The component test never runs the real loader
// (createRoutesStub provides a stub), but ESM evaluates side effects on import.
// Stub the server-only modules so importing Home doesn't blow up.
vi.mock("~/services/todos", () => ({
  listTodos: vi.fn(),
  createTodo: vi.fn(),
  toggleComplete: vi.fn(),
  deleteTodo: vi.fn(),
  getTodoOwnership: vi.fn(),
}));
vi.mock("../../db/client", () => ({ db: {}, sql: { end: vi.fn() } }));

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub } from "react-router";
import Home from "./home";
import { ToastProvider } from "~/lib/toast-store";
import { ToastViewport } from "~/components/Toast";
import type { Todo } from "~/types/todo";

function makeTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: crypto.randomUUID(),
    description: "default description",
    completionStatus: false,
    createdAt: new Date(),
    ownerId: "11111111-2222-4333-8444-555555555555",
    ...overrides,
  };
}

function mountWithLoader(loaderReturn: unknown) {
  const Stub = createRoutesStub([
    {
      path: "/",
      Component: Home,
      loader: () => loaderReturn,
    },
  ]);
  return render(
    <ToastProvider>
      <Stub initialEntries={["/"]} />
      <ToastViewport />
    </ToastProvider>,
  );
}

describe("Home route", () => {
  it("renders EmptyState when loader returns ok with empty todos", async () => {
    mountWithLoader({ ok: true, data: { todos: [] } });
    expect(await screen.findByTestId("empty-state")).toHaveTextContent(
      "Nothing on the list.",
    );
  });

  it("renders ListItem rows in the order returned by the loader", async () => {
    const newer = makeTodo({ description: "newer" });
    const older = makeTodo({ description: "older" });
    mountWithLoader({ ok: true, data: { todos: [newer, older] } });
    const items = await screen.findAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("newer");
    expect(items[1]).toHaveTextContent("older");
  });

  it("applies completed treatment to a todo with completionStatus=true", async () => {
    const done = makeTodo({ description: "done one", completionStatus: true });
    mountWithLoader({ ok: true, data: { todos: [done] } });
    const item = await screen.findByTestId(`todo-item-${done.id}`);
    expect(item).toHaveAttribute("data-completed", "true");
  });

  it("renders ErrorState with message and a Retry button when loader returns ok:false", async () => {
    mountWithLoader({
      ok: false,
      error: { code: "internal", message: "Couldn't load the list." },
    });
    expect(await screen.findByTestId("error-state")).toHaveTextContent(
      "Couldn't load the list.",
    );
    const retry = screen.getByTestId("error-retry");
    expect(retry).toBeEnabled();
    await userEvent.click(retry);
  });

  it("adds a todo optimistically when user types and presses Enter", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => {
      // Server confirms with a fresh row. createdAt comes back as ISO string
      // (matches real wire format).
      return new Response(
        JSON.stringify({
          ok: true,
          data: {
            id: crypto.randomUUID(),
            description: "buy milk",
            completionStatus: false,
            createdAt: new Date().toISOString(),
            ownerId: "11111111-2222-4333-8444-555555555555",
          },
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    mountWithLoader({ ok: true, data: { todos: [] } });
    const input = await screen.findByTestId("todo-input");
    await userEvent.type(input, "buy milk{Enter}");

    // Optimistic row appears immediately and the fetch fires.
    const items = await screen.findAllByRole("listitem");
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent("buy milk");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // Input cleared and refocused.
    expect(input).toHaveValue("");
  });

  it("silently rejects whitespace-only Enter", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    mountWithLoader({ ok: true, data: { todos: [] } });
    const input = await screen.findByTestId("todo-input");
    await userEvent.type(input, "   {Enter}");

    expect(fetchMock).not.toHaveBeenCalled();
    // Empty state still showing — nothing was added.
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
  });

  it("reverts the optimistic add and surfaces a toast when the server returns ok:false", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: false,
          error: { code: "INTERNAL", message: "Couldn't save" },
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    mountWithLoader({ ok: true, data: { todos: [] } });
    const input = await screen.findByTestId("todo-input");
    await userEvent.type(input, "doomed{Enter}");

    // Empty state restored after revert.
    expect(await screen.findByTestId("empty-state")).toBeInTheDocument();
    // Toast surfaces with the original description.
    const toast = await screen.findByTestId("toast");
    expect(toast).toHaveTextContent("Couldn't save");
    expect(toast).toHaveTextContent("doomed");
    expect(warnSpy).toHaveBeenCalled();

    vi.unstubAllGlobals();
    warnSpy.mockRestore();
  });

  it("Retry from toast re-dispatches with the same UUID (idempotency)", async () => {
    const failOnce = new Response(
      JSON.stringify({ ok: false, error: { code: "INTERNAL", message: "fail" } }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce(failOnce);
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "warn").mockImplementation(() => {});

    mountWithLoader({ ok: true, data: { todos: [] } });
    const input = await screen.findByTestId("todo-input");
    await userEvent.type(input, "retry me{Enter}");

    // Wait for revert + toast.
    const toast = await screen.findByTestId("toast");
    expect(toast).toBeInTheDocument();

    // Capture the id sent on the first attempt.
    const firstBody = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    const firstId = firstBody.id as string;

    // Set up the success response for the retry.
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: true,
          data: {
            id: firstId,
            description: "retry me",
            completionStatus: false,
            createdAt: new Date().toISOString(),
            ownerId: "11111111-2222-4333-8444-555555555555",
          },
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    );

    await userEvent.click(screen.getByTestId("toast-retry"));

    // Second fetch should have used the same id.
    const secondBody = JSON.parse((fetchMock.mock.calls[1][1] as RequestInit).body as string);
    expect(secondBody.id).toBe(firstId);
    expect(secondBody.description).toBe("retry me");

    vi.unstubAllGlobals();
  });

  it("dismissing a toast without retrying does not re-attempt", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ ok: false, error: { code: "INTERNAL", message: "fail" } }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "warn").mockImplementation(() => {});

    mountWithLoader({ ok: true, data: { todos: [] } });
    await userEvent.type(await screen.findByTestId("todo-input"), "give up{Enter}");

    await screen.findByTestId("toast");
    await userEvent.click(screen.getByLabelText("Dismiss"));

    // Toast gone; no second fetch fired.
    expect(screen.queryByTestId("toast")).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    vi.unstubAllGlobals();
  });

  it("submitting via the mobile submit button calls the same flow as Enter", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          data: {
            id: crypto.randomUUID(),
            description: "tap submit",
            completionStatus: false,
            createdAt: new Date().toISOString(),
            ownerId: "11111111-2222-4333-8444-555555555555",
          },
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    mountWithLoader({ ok: true, data: { todos: [] } });
    const input = await screen.findByTestId("todo-input");
    await userEvent.type(input, "tap submit");
    await userEvent.click(screen.getByTestId("todo-submit"));

    const items = await screen.findAllByRole("listitem");
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent("tap submit");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(input).toHaveValue("");

    vi.unstubAllGlobals();
  });

  it("mobile submit button silently rejects whitespace-only", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    mountWithLoader({ ok: true, data: { todos: [] } });
    const input = await screen.findByTestId("todo-input");
    await userEvent.type(input, "   ");
    await userEvent.click(screen.getByTestId("todo-submit"));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();

    vi.unstubAllGlobals();
  });

  it("every interactive control has a discoverable aria-label", async () => {
    const todo = makeTodo({ description: "label test" });
    mountWithLoader({ ok: true, data: { todos: [todo] } });

    // TextInput
    expect(await screen.findByLabelText("Add a todo")).toBeInTheDocument();
    // Mobile submit button (in DOM regardless of viewport)
    expect(screen.getByLabelText("Submit")).toBeInTheDocument();
    // Checkbox in ListItem
    expect(
      screen.getByLabelText(`Toggle: ${todo.description}`),
    ).toBeInTheDocument();
    // Delete button in ListItem
    expect(
      screen.getByLabelText(`Delete: ${todo.description}`),
    ).toBeInTheDocument();
  });

  it("two concurrent toggle failures produce two stacked toasts (FR29)", async () => {
    const todoA = makeTodo({ description: "A" });
    const todoB = makeTodo({ description: "B" });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ ok: false, error: { code: "INTERNAL", message: "fail" } }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "warn").mockImplementation(() => {});

    mountWithLoader({ ok: true, data: { todos: [todoA, todoB] } });

    await userEvent.click(await screen.findByLabelText(`Toggle: ${todoA.description}`));
    await userEvent.click(screen.getByLabelText(`Toggle: ${todoB.description}`));

    const toasts = await screen.findAllByTestId("toast");
    expect(toasts).toHaveLength(2);
    expect(toasts.some((t) => t.textContent?.includes("A"))).toBe(true);
    expect(toasts.some((t) => t.textContent?.includes("B"))).toBe(true);

    vi.unstubAllGlobals();
  });

  it("optimistically deletes when the delete button is clicked", async () => {
    const todo = makeTodo({ description: "to delete" });
    let resolveFetch: ((value: Response) => void) | undefined;
    const fetchMock = vi.fn().mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    mountWithLoader({ ok: true, data: { todos: [todo] } });

    const deleteBtn = await screen.findByLabelText(`Delete: ${todo.description}`);
    expect(screen.getByTestId(`todo-item-${todo.id}`)).toBeInTheDocument();

    await userEvent.click(deleteBtn);

    // Optimistic remove happens before the fetch resolves.
    expect(screen.queryByTestId(`todo-item-${todo.id}`)).toBeNull();

    // Verify the DELETE was issued correctly.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`/api/todos/${todo.id}`);
    expect(init.method).toBe("DELETE");

    resolveFetch?.(
      new Response(
        JSON.stringify({ ok: true, data: { deleted: true, row: null } }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.unstubAllGlobals();
  });

  it("optimistically toggles completion when checkbox is clicked", async () => {
    const todo = makeTodo({ description: "do laundry", completionStatus: false });
    let resolveFetch: ((value: Response) => void) | undefined;
    const fetchMock = vi.fn().mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    mountWithLoader({ ok: true, data: { todos: [todo] } });

    // Find the checkbox via its aria-label (set from description).
    const checkbox = await screen.findByLabelText(`Toggle: ${todo.description}`);
    expect(screen.getByTestId(`todo-item-${todo.id}`)).toHaveAttribute(
      "data-completed",
      "false",
    );

    await userEvent.click(checkbox);

    // Optimistic flip happens before the fetch resolves.
    expect(screen.getByTestId(`todo-item-${todo.id}`)).toHaveAttribute(
      "data-completed",
      "true",
    );

    // Verify the PATCH request was issued correctly.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe("PATCH");
    expect(init.body).toBe(JSON.stringify({ completed: true }));

    // Resolve the fetch with success — confirm doesn't re-flip the row.
    resolveFetch?.(
      new Response(
        JSON.stringify({
          ok: true,
          data: { ...todo, completionStatus: true, createdAt: todo.createdAt.toISOString() },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.unstubAllGlobals();
  });
});
