import styles from "./LoadingState.module.css";

export function LoadingState() {
  return (
    <p className={styles.text} data-testid="loading-state">
      Loading…
    </p>
  );
}
