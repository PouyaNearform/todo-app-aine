import { useCallback } from "react";
import {
  dispatchAddTodo,
  dispatchDeleteTodo,
  dispatchToggleComplete,
  useDispatch,
} from "~/lib/optimistic-store";
import { useShowToast } from "~/lib/toast-store";

// Each hook returns a callback that combines the optimistic store dispatcher
// with toast spawning on failure. The toast's onRetry closure captures the
// original payload and re-invokes the dispatcher — this is the
// payload-preserving Retry contract.
//
// For add: the same client-generated UUID is reused across retries so
// INSERT ... ON CONFLICT (id) DO NOTHING stays idempotent on the server.

export function useAddTodo(): (description: string) => void {
  const dispatch = useDispatch();
  const showToast = useShowToast();
  return useCallback(
    (description: string) => {
      const id = crypto.randomUUID();
      const attempt = () => {
        void dispatchAddTodo(dispatch, description, id, () => {
          showToast({
            id: crypto.randomUUID(),
            heading: "Couldn't save",
            description,
            onRetry: attempt,
          });
        });
      };
      attempt();
    },
    [dispatch, showToast],
  );
}

export function useToggleComplete(): (
  id: string,
  next: boolean,
  description: string,
) => void {
  const dispatch = useDispatch();
  const showToast = useShowToast();
  return useCallback(
    (id, next, description) => {
      const attempt = () => {
        void dispatchToggleComplete(dispatch, id, next, () => {
          showToast({
            id: crypto.randomUUID(),
            heading: "Couldn't update",
            description,
            onRetry: attempt,
          });
        });
      };
      attempt();
    },
    [dispatch, showToast],
  );
}

export function useDeleteTodo(): (id: string, description: string) => void {
  const dispatch = useDispatch();
  const showToast = useShowToast();
  return useCallback(
    (id, description) => {
      const attempt = () => {
        void dispatchDeleteTodo(dispatch, id, () => {
          showToast({
            id: crypto.randomUUID(),
            heading: "Couldn't delete",
            description,
            onRetry: attempt,
          });
        });
      };
      attempt();
    },
    [dispatch, showToast],
  );
}
