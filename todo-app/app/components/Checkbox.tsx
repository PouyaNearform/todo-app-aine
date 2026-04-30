import styles from "./Checkbox.module.css";

type CheckboxProps = {
  checked: boolean;
  onToggle: (next: boolean) => void;
  ariaLabel: string;
  testId?: string;
};

export function Checkbox({ checked, onToggle, ariaLabel, testId }: CheckboxProps) {
  return (
    <label className={styles.wrapper} data-testid={testId}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onToggle(e.target.checked)}
        aria-label={ariaLabel}
        className={styles.input}
      />
      <span className={styles.glyph} aria-hidden="true">
        {checked ? <span className={styles.check} /> : null}
      </span>
    </label>
  );
}
