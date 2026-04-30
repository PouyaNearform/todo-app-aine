import type { Todo } from "~/types/todo";
import styles from "./ListItem.module.css";

type ListItemProps = {
  todo: Todo;
};

export function ListItem({ todo }: ListItemProps) {
  const completed = todo.completionStatus;
  return (
    <li
      className={styles.item}
      data-testid={`todo-item-${todo.id}`}
      data-completed={completed ? "true" : "false"}
    >
      <span className={styles.checkbox} aria-hidden="true">
        {completed ? <span className={styles.check} /> : null}
      </span>
      <span className={completed ? styles.descriptionDone : styles.description}>
        {todo.description}
      </span>
      <span className={styles.delete} aria-hidden="true">
        ×
      </span>
    </li>
  );
}
