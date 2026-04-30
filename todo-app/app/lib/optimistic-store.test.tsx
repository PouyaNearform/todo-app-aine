import { act, render, screen } from "@testing-library/react";
import {
  INITIAL_STATE,
  OptimisticStoreProvider,
  reducer,
  useDispatch,
  useStore,
  useTodos,
  type Action,
  type State,
} from "./optimistic-store";
import type { Todo } from "~/types/todo";

let counter = 0;
function makeTodo(overrides: Partial<Todo> = {}): Todo {
  counter += 1;
  return {
    id: crypto.randomUUID(),
    description: `todo ${counter}`,
    completionStatus: false,
    createdAt: new Date(2026, 0, 1, 12, 0, counter),
    ownerId: "11111111-2222-4333-8444-555555555555",
    ...overrides,
  };
}

const mid = (): string => crypto.randomUUID();

describe("reducer", () => {
  describe("seed", () => {
    it("replaces todos and clears pendingMutations", () => {
      const start: State = {
        todos: [makeTodo()],
        pendingMutations: { [mid()]: { kind: "add", tempTodo: makeTodo() } },
      };
      const a = makeTodo();
      const b = makeTodo();
      const next = reducer(start, { type: "seed", todos: [a, b] });
      expect(next.todos).toEqual([a, b]);
      expect(next.pendingMutations).toEqual({});
    });
  });

  describe("addTodo", () => {
    it("prepends tempTodo and records pending entry", () => {
      const t1 = makeTodo({ description: "first" });
      const id1 = mid();
      const next = reducer(INITIAL_STATE, {
        type: "addTodo",
        mutationId: id1,
        tempTodo: t1,
      });
      expect(next.todos).toEqual([t1]);
      expect(next.pendingMutations[id1]).toEqual({ kind: "add", tempTodo: t1 });
    });

    it("two consecutive adds appear at front in dispatch order (newest first)", () => {
      const a = makeTodo({ description: "a" });
      const b = makeTodo({ description: "b" });
      let s: State = INITIAL_STATE;
      s = reducer(s, { type: "addTodo", mutationId: mid(), tempTodo: a });
      s = reducer(s, { type: "addTodo", mutationId: mid(), tempTodo: b });
      expect(s.todos.map((t) => t.description)).toEqual(["b", "a"]);
    });
  });

  describe("toggleComplete", () => {
    it("flips completionStatus and records previousStatus", () => {
      const t = makeTodo({ completionStatus: false });
      const start: State = { todos: [t], pendingMutations: {} };
      const id = mid();
      const next = reducer(start, {
        type: "toggleComplete",
        mutationId: id,
        id: t.id,
      });
      expect(next.todos[0].completionStatus).toBe(true);
      expect(next.pendingMutations[id]).toEqual({
        kind: "toggle",
        id: t.id,
        previousStatus: false,
      });
    });

    it("no-ops when id is unknown", () => {
      const t = makeTodo();
      const start: State = { todos: [t], pendingMutations: {} };
      const next = reducer(start, {
        type: "toggleComplete",
        mutationId: mid(),
        id: "ghost-id",
      });
      expect(next).toBe(start);
    });
  });

  describe("deleteTodo", () => {
    it("removes the todo and records previousTodo", () => {
      const t = makeTodo();
      const start: State = { todos: [t], pendingMutations: {} };
      const id = mid();
      const next = reducer(start, {
        type: "deleteTodo",
        mutationId: id,
        id: t.id,
      });
      expect(next.todos).toEqual([]);
      expect(next.pendingMutations[id]).toEqual({
        kind: "delete",
        previousTodo: t,
      });
    });

    it("no-ops when id is unknown", () => {
      const start: State = { todos: [makeTodo()], pendingMutations: {} };
      const next = reducer(start, {
        type: "deleteTodo",
        mutationId: mid(),
        id: "ghost-id",
      });
      expect(next).toBe(start);
    });
  });

  describe("confirmMutation", () => {
    it("drops the pending entry on success", () => {
      const t = makeTodo();
      const id = mid();
      const start: State = {
        todos: [t],
        pendingMutations: { [id]: { kind: "add", tempTodo: t } },
      };
      const next = reducer(start, { type: "confirmMutation", mutationId: id });
      expect(next.pendingMutations[id]).toBeUndefined();
      expect(next.todos).toEqual([t]);
    });

    it("replaces tempTodo with serverTodo when ids differ (defensive)", () => {
      const temp = makeTodo({ id: "temp-id" });
      const server = makeTodo({ id: "server-id", description: temp.description });
      const id = mid();
      const start: State = {
        todos: [temp],
        pendingMutations: { [id]: { kind: "add", tempTodo: temp } },
      };
      const next = reducer(start, {
        type: "confirmMutation",
        mutationId: id,
        serverTodo: server,
      });
      expect(next.todos[0].id).toBe("server-id");
    });

    it("no-ops when mutationId is unknown", () => {
      const start: State = { todos: [makeTodo()], pendingMutations: {} };
      const next = reducer(start, {
        type: "confirmMutation",
        mutationId: "ghost-id",
      });
      expect(next).toBe(start);
    });
  });

  describe("revertMutation", () => {
    it("kind=add: removes the tempTodo", () => {
      const t = makeTodo();
      const id = mid();
      const start: State = {
        todos: [t],
        pendingMutations: { [id]: { kind: "add", tempTodo: t } },
      };
      const next = reducer(start, { type: "revertMutation", mutationId: id });
      expect(next.todos).toEqual([]);
      expect(next.pendingMutations[id]).toBeUndefined();
    });

    it("kind=toggle: restores previousStatus", () => {
      const t = makeTodo({ completionStatus: true }); // currently flipped
      const id = mid();
      const start: State = {
        todos: [t],
        pendingMutations: {
          [id]: { kind: "toggle", id: t.id, previousStatus: false },
        },
      };
      const next = reducer(start, { type: "revertMutation", mutationId: id });
      expect(next.todos[0].completionStatus).toBe(false);
      expect(next.pendingMutations[id]).toBeUndefined();
    });

    it("kind=delete: re-inserts previousTodo at correct position", () => {
      const older = makeTodo({ description: "older" });
      const newer = makeTodo({ description: "newer" });
      const id = mid();
      const start: State = {
        todos: [newer], // older was deleted
        pendingMutations: { [id]: { kind: "delete", previousTodo: older } },
      };
      const next = reducer(start, { type: "revertMutation", mutationId: id });
      expect(next.todos.map((t) => t.description)).toEqual(["newer", "older"]);
    });

    it("no-ops when mutationId is unknown", () => {
      const start: State = { todos: [makeTodo()], pendingMutations: {} };
      const next = reducer(start, {
        type: "revertMutation",
        mutationId: "ghost-id",
      });
      expect(next).toBe(start);
    });
  });

  describe("concurrent mutations (state stays uncorrupted)", () => {
    it("addA → addB → confirmA leaves both todos and pending=B", () => {
      const a = makeTodo({ description: "a" });
      const b = makeTodo({ description: "b" });
      const idA = mid();
      const idB = mid();
      let s: State = INITIAL_STATE;
      s = reducer(s, { type: "addTodo", mutationId: idA, tempTodo: a });
      s = reducer(s, { type: "addTodo", mutationId: idB, tempTodo: b });
      s = reducer(s, { type: "confirmMutation", mutationId: idA });
      expect(s.todos.map((t) => t.description)).toEqual(["b", "a"]);
      expect(s.pendingMutations[idA]).toBeUndefined();
      expect(s.pendingMutations[idB]).toBeDefined();
    });

    it("addA → addB → revertA leaves only B and pending=B", () => {
      const a = makeTodo({ description: "a" });
      const b = makeTodo({ description: "b" });
      const idA = mid();
      const idB = mid();
      let s: State = INITIAL_STATE;
      s = reducer(s, { type: "addTodo", mutationId: idA, tempTodo: a });
      s = reducer(s, { type: "addTodo", mutationId: idB, tempTodo: b });
      s = reducer(s, { type: "revertMutation", mutationId: idA });
      expect(s.todos.map((t) => t.description)).toEqual(["b"]);
      expect(s.pendingMutations[idA]).toBeUndefined();
      expect(s.pendingMutations[idB]).toBeDefined();
    });
  });

  describe("FR29: failure of one mutation never blocks another", () => {
    it("revertA does not interfere with subsequent addB", () => {
      const a = makeTodo({ description: "a" });
      const b = makeTodo({ description: "b" });
      const idA = mid();
      const idB = mid();
      let s: State = INITIAL_STATE;
      s = reducer(s, { type: "addTodo", mutationId: idA, tempTodo: a });
      s = reducer(s, { type: "revertMutation", mutationId: idA });
      s = reducer(s, { type: "addTodo", mutationId: idB, tempTodo: b });
      s = reducer(s, { type: "confirmMutation", mutationId: idB });
      expect(s.todos.map((t) => t.description)).toEqual(["b"]);
      expect(s.pendingMutations).toEqual({});
    });
  });
});

describe("Provider integration", () => {
  function TestConsumer() {
    const todos = useTodos();
    return <div data-testid="count">{todos.length}</div>;
  }

  function DispatchTrigger({ action }: { action: Action }) {
    const dispatch = useDispatch();
    return (
      <button data-testid="trigger" onClick={() => dispatch(action)}>
        go
      </button>
    );
  }

  it("provides initial state via useTodos", () => {
    render(
      <OptimisticStoreProvider initialTodos={[makeTodo(), makeTodo()]}>
        <TestConsumer />
      </OptimisticStoreProvider>,
    );
    expect(screen.getByTestId("count")).toHaveTextContent("2");
  });

  it("dispatching addTodo updates the rendered count", () => {
    const tempTodo = makeTodo();
    render(
      <OptimisticStoreProvider>
        <TestConsumer />
        <DispatchTrigger
          action={{ type: "addTodo", mutationId: mid(), tempTodo }}
        />
      </OptimisticStoreProvider>,
    );
    expect(screen.getByTestId("count")).toHaveTextContent("0");
    act(() => {
      screen.getByTestId("trigger").click();
    });
    expect(screen.getByTestId("count")).toHaveTextContent("1");
  });

  it("useStore throws when called outside the provider", () => {
    function BadConsumer() {
      useStore();
      return null;
    }
    // Suppress React's expected error log for this assertion.
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<BadConsumer />)).toThrow(
      /useStore must be called inside OptimisticStoreProvider/,
    );
    errSpy.mockRestore();
  });
});
