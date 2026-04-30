import styles from "./ErrorState.module.css";

type ErrorStateProps = {
  message: string;
  onRetry: () => void;
};

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <aside className={styles.root} data-testid="error-state">
      <p className={styles.message}>{message}</p>
      <button
        type="button"
        className={styles.retry}
        data-testid="error-retry"
        onClick={onRetry}
      >
        Retry
      </button>
    </aside>
  );
}
