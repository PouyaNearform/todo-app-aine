import styles from "./EmptyState.module.css";

export function EmptyState() {
  return (
    <p className={styles.text} data-testid="empty-state">
      Nothing on the list.
    </p>
  );
}
