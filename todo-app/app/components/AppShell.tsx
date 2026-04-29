import type { ReactNode } from "react";
import styles from "./AppShell.module.css";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <main id="main" className={styles.shell}>
      {children}
    </main>
  );
}
