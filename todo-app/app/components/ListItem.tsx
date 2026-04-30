import { Checkbox } from "~/components/Checkbox";
import { dispatchToggleComplete, useDispatch } from "~/lib/optimistic-store";
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
      <span className={styles.delete} aria-hidden="true">
        ×
      </span>
    </li>
  );
}
