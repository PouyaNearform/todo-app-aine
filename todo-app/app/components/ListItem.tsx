import { Checkbox } from "~/components/Checkbox";
import {
  dispatchDeleteTodo,
  dispatchToggleComplete,
  useDispatch,
} from "~/lib/optimistic-store";
import type { Todo } from "~/types/todo";
import styles from "./ListItem.module.css";

type ListItemProps = {
  todo: Todo;
};

export function ListItem({ todo }: ListItemProps) {
  const dispatch = useDispatch();
  const completed = todo.completionStatus;

  return (
    <li
      className={styles.item}
      data-testid={`todo-item-${todo.id}`}
      data-completed={completed ? "true" : "false"}
    >
      <Checkbox
        checked={completed}
        onToggle={(next) => dispatchToggleComplete(dispatch, todo.id, next)}
        ariaLabel={`Toggle: ${todo.description}`}
        testId={`todo-checkbox-${todo.id}`}
      />
      <span className={completed ? styles.descriptionDone : styles.description}>
        {todo.description}
      </span>
      <button
        type="button"
        className={styles.deleteButton}
        aria-label={`Delete: ${todo.description}`}
        data-testid={`todo-delete-${todo.id}`}
        onClick={() => dispatchDeleteTodo(dispatch, todo.id)}
      >
        <span className={styles.deleteGlyph} aria-hidden="true">
          ×
        </span>
      </button>
    </li>
  );
}
