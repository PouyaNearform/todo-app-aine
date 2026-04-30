// The route's loader transitively imports db/client, which throws on missing
// DATABASE_URL at module load. The component test never runs the real loader
// (createRoutesStub provides a stub), but ESM evaluates side effects on import.
// Stub the server-only modules so importing Home doesn't blow up.
vi.mock("~/services/todos", () => ({ listTodos: vi.fn() }));
vi.mock("../../db/client", () => ({ db: {}, sql: { end: vi.fn() } }));

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub } from "react-router";
import Home from "./home";
import { OptimisticStoreProvider } from "~/lib/optimistic-store";
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
    <OptimisticStoreProvider>
      <Stub initialEntries={["/"]} />
    </OptimisticStoreProvider>,
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
    // Just confirm the click handler is wired and doesn't throw.
    await userEvent.click(retry);
  });
});
