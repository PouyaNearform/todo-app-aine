import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";

export type ToastId = string;

export type Toast = {
  id: ToastId;
  heading: string;
  description: string;
  onRetry: () => void;
};

type ToastState = { toasts: Toast[] };

type ToastAction =
  | { type: "show"; toast: Toast }
  | { type: "dismiss"; id: ToastId };

const INITIAL_STATE: ToastState = { toasts: [] };

function reducer(state: ToastState, action: ToastAction): ToastState {
  switch (action.type) {
    case "show":
      return { toasts: [...state.toasts, action.toast] };
    case "dismiss":
      return { toasts: state.toasts.filter((t) => t.id !== action.id) };
  }
}

type ToastContextValue = {
  state: ToastState;
  dispatch: Dispatch<ToastAction>;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return (
    <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
  );
}

function useToastContext(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("Toast hooks must be used inside ToastProvider");
  }
  return ctx;
}

export function useToasts(): Toast[] {
  return useToastContext().state.toasts;
}

export function useShowToast(): (toast: Toast) => void {
  const { dispatch } = useToastContext();
  return useCallback(
    (toast: Toast) => dispatch({ type: "show", toast }),
    [dispatch],
  );
}

export function useDismissToast(): (id: ToastId) => void {
  const { dispatch } = useToastContext();
  return useCallback(
    (id: ToastId) => dispatch({ type: "dismiss", id }),
    [dispatch],
  );
}
