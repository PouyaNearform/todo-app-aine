import {
  useDismissToast,
  useToasts,
  type Toast as ToastType,
} from "~/lib/toast-store";
import styles from "./Toast.module.css";

export function truncate(s: string, max = 40): string {
  return s.length <= max ? s : s.slice(0, max - 1) + "…";
}

type ToastProps = {
  toast: ToastType;
  onDismiss: () => void;
};

export function Toast({ toast, onDismiss }: ToastProps) {
  const display = truncate(toast.description);
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={styles.toast}
      data-testid="toast"
    >
      <div className={styles.headerRow}>
        <strong className={styles.heading}>{toast.heading}</strong>
        <button
          type="button"
          className={styles.dismissButton}
          aria-label="Dismiss"
          onClick={onDismiss}
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
      <p className={styles.body}>'{display}'</p>
      <div className={styles.actionRow}>
        <button
          type="button"
          className={styles.retryButton}
          aria-label={`Retry: ${display}`}
          data-testid="toast-retry"
          onClick={() => {
            toast.onRetry();
            onDismiss();
          }}
        >
          Retry
        </button>
      </div>
    </div>
  );
}

export function ToastViewport() {
  const toasts = useToasts();
  const dismiss = useDismissToast();
  if (toasts.length === 0) return null;
  return (
    <div className={styles.viewport}>
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
      ))}
    </div>
  );
}
