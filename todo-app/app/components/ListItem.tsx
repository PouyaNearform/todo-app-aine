import { Checkbox } from "~/components/Checkbox";
import { useDeleteTodo, useToggleComplete } from "~/lib/mutation-flows";
import type { Todo } from "~/types/todo";
import styles from "./ListItem.module.css";

type ListItemProps = {
  todo: Todo;
};

export function ListItem({ todo }: ListItemProps) {
  const toggle = useToggleComplete();
  const remove = useDeleteTodo();
  const completed = todo.completionStatus;

  return (
    <li
      className={styles.item}
      data-testid={`todo-item-${todo.id}`}
      data-completed={completed ? "true" : "false"}
    >
      <Checkbox
        checked={completed}
        onToggle={(next) => toggle(todo.id, next, todo.description)}
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
        onClick={() => remove(todo.id, todo.description)}
      >
        <span className={styles.deleteGlyph} aria-hidden="true">
          ×
        </span>
      </button>
    </li>
  );
}
