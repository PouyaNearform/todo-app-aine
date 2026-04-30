import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type Dispatch,
  type ReactNode,
} from "react";
import { browserKeyFetch, getBrowserKey } from "~/lib/browser-key";
import type { MutationId, PendingMutation, Todo } from "~/types/todo";

export type State = {
  todos: Todo[];
  pendingMutations: Record<MutationId, PendingMutation>;
};

export type Action =
  | { type: "seed"; todos: Todo[] }
  | { type: "addTodo"; mutationId: MutationId; tempTodo: Todo }
  | { type: "toggleComplete"; mutationId: MutationId; id: string }
  | { type: "deleteTodo"; mutationId: MutationId; id: string }
  | { type: "confirmMutation"; mutationId: MutationId; serverTodo?: Todo }
  | { type: "revertMutation"; mutationId: MutationId };

export const INITIAL_STATE: State = { todos: [], pendingMutations: {} };

function withoutKey<V>(
  obj: Record<string, V>,
  key: string,
): Record<string, V> {
  const { [key]: _drop, ...rest } = obj;
  return rest;
}

function insertByCreatedAtDesc(todos: Todo[], todo: Todo): Todo[] {
  const idx = todos.findIndex(
    (t) => t.createdAt.getTime() < todo.createdAt.getTime(),
  );
  if (idx === -1) return [...todos, todo];
  return [...todos.slice(0, idx), todo, ...todos.slice(idx)];
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "seed":
      return { todos: action.todos, pendingMutations: {} };

    case "addTodo":
      return {
        todos: [action.tempTodo, ...state.todos],
        pendingMutations: {
          ...state.pendingMutations,
          [action.mutationId]: { kind: "add", tempTodo: action.tempTodo },
        },
      };

    case "toggleComplete": {
      const target = state.todos.find((t) => t.id === action.id);
      if (!target) return state;
      return {
        todos: state.todos.map((t) =>
          t.id === action.id ? { ...t, completionStatus: !t.completionStatus } : t,
        ),
        pendingMutations: {
          ...state.pendingMutations,
          [action.mutationId]: {
            kind: "toggle",
            id: action.id,
            previousStatus: target.completionStatus,
          },
        },
      };
    }

    case "deleteTodo": {
      const target = state.todos.find((t) => t.id === action.id);
      if (!target) return state;
      return {
        todos: state.todos.filter((t) => t.id !== action.id),
        pendingMutations: {
          ...state.pendingMutations,
          [action.mutationId]: { kind: "delete", previousTodo: target },
        },
      };
    }

    case "confirmMutation": {
      const pending = state.pendingMutations[action.mutationId];
      if (!pending) return state;
      let todos = state.todos;
      if (
        pending.kind === "add" &&
        action.serverTodo &&
        action.serverTodo.id !== pending.tempTodo.id
      ) {
        todos = state.todos.map((t) =>
          t.id === pending.tempTodo.id ? action.serverTodo! : t,
        );
      }
      return {
        todos,
        pendingMutations: withoutKey(state.pendingMutations, action.mutationId),
      };
    }

    case "revertMutation": {
      const pending = state.pendingMutations[action.mutationId];
      if (!pending) return state;
      let todos = state.todos;
      switch (pending.kind) {
        case "add":
          todos = state.todos.filter((t) => t.id !== pending.tempTodo.id);
          break;
        case "toggle":
          todos = state.todos.map((t) =>
            t.id === pending.id
              ? { ...t, completionStatus: pending.previousStatus }
              : t,
          );
          break;
        case "delete":
          todos = insertByCreatedAtDesc(state.todos, pending.previousTodo);
          break;
      }
      return {
        todos,
        pendingMutations: withoutKey(state.pendingMutations, action.mutationId),
      };
    }
  }
}

type StoreContextValue = { state: State; dispatch: Dispatch<Action> };

const StoreContext = createContext<StoreContextValue | null>(null);

export function OptimisticStoreProvider({
  children,
  initialTodos = [],
}: {
  children: ReactNode;
  initialTodos?: Todo[];
}) {
  const [state, dispatch] = useReducer(reducer, {
    todos: initialTodos,
    pendingMutations: {},
  });
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error("useStore must be called inside OptimisticStoreProvider");
  }
  return ctx;
}

export function useTodos(): Todo[] {
  return useStore().state.todos;
}

export function usePendingMutations(): Record<MutationId, PendingMutation> {
  return useStore().state.pendingMutations;
}

export function useDispatch(): Dispatch<Action> {
  return useStore().dispatch;
}

export function useSeedFromLoader(todos: Todo[]): void {
  const dispatch = useDispatch();
  const lastSeedKey = useRef<string | null>(null);
  useEffect(() => {
    // Dedupe by content so callers passing fresh array refs (e.g. `[]` literal
    // each render) don't trigger an infinite seed → re-render → seed loop.
    const key = `${todos.length}:${todos
      .map((t) => `${t.id}@${t.completionStatus ? 1 : 0}`)
      .join(",")}`;
    if (lastSeedKey.current !== key) {
      lastSeedKey.current = key;
      dispatch({ type: "seed", todos });
    }
  }, [todos, dispatch]);
}

export async function dispatchAddTodo(
  dispatch: Dispatch<Action>,
  description: string,
): Promise<void> {
  const id = crypto.randomUUID();
  const mutationId = crypto.randomUUID();
  const ownerId = getBrowserKey();
  const tempTodo: Todo = {
    id,
    description,
    completionStatus: false,
    createdAt: new Date(),
    ownerId: ownerId || null,
  };

  dispatch({ type: "addTodo", mutationId, tempTodo });

  try {
    const res = await browserKeyFetch("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, description }),
    });
    const envelope = (await res.json()) as {
      ok: boolean;
      data?: Todo;
      error?: unknown;
    };
    if (envelope.ok && envelope.data) {
      // Server's createdAt comes back as a JSON string; revive to Date so
      // downstream rendering / sorting stays type-safe.
      const serverTodo: Todo = {
        ...envelope.data,
        createdAt: new Date(envelope.data.createdAt as unknown as string),
      };
      dispatch({ type: "confirmMutation", mutationId, serverTodo });
    } else {
      console.warn("addTodo failed; reverting", envelope);
      dispatch({ type: "revertMutation", mutationId });
    }
  } catch (e) {
    console.warn("addTodo network error; reverting", e);
    dispatch({ type: "revertMutation", mutationId });
  }
}

export async function dispatchToggleComplete(
  dispatch: Dispatch<Action>,
  id: string,
  next: boolean,
): Promise<void> {
  const mutationId = crypto.randomUUID();
  dispatch({ type: "toggleComplete", mutationId, id });

  try {
    const res = await browserKeyFetch(`/api/todos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: next }),
    });
    const envelope = (await res.json()) as {
      ok: boolean;
      data?: Todo;
      error?: unknown;
    };
    if (envelope.ok) {
      dispatch({ type: "confirmMutation", mutationId });
    } else {
      console.warn("toggleComplete failed; reverting", envelope);
      dispatch({ type: "revertMutation", mutationId });
    }
  } catch (e) {
    console.warn("toggleComplete network error; reverting", e);
    dispatch({ type: "revertMutation", mutationId });
  }
}

export async function dispatchDeleteTodo(
  dispatch: Dispatch<Action>,
  id: string,
): Promise<void> {
  const mutationId = crypto.randomUUID();
  dispatch({ type: "deleteTodo", mutationId, id });

  try {
    const res = await browserKeyFetch(`/api/todos/${id}`, {
      method: "DELETE",
    });
    const envelope = (await res.json()) as { ok: boolean; error?: unknown };
    if (envelope.ok) {
      dispatch({ type: "confirmMutation", mutationId });
    } else {
      console.warn("deleteTodo failed; reverting", envelope);
      dispatch({ type: "revertMutation", mutationId });
    }
  } catch (e) {
    console.warn("deleteTodo network error; reverting", e);
    dispatch({ type: "revertMutation", mutationId });
  }
}
