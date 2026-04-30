import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import styles from "./TextInput.module.css";

type TextInputProps = {
  onSubmit: (description: string) => void;
};

export function TextInput({ onSubmit }: TextInputProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(min-width: 641px)").matches) {
      inputRef.current?.focus();
    }
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      const trimmed = value.trim();
      if (!trimmed) return;
      onSubmit(trimmed);
      setValue("");
      inputRef.current?.focus();
      return;
    }
    if (event.key === "Escape") {
      setValue("");
    }
  }

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      maxLength={256}
      placeholder="Add a todo"
      aria-label="Add a todo"
      data-testid="todo-input"
      className={styles.input}
    />
  );
}
