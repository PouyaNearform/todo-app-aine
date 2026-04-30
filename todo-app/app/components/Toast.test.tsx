import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toast, truncate } from "./Toast";
import type { Toast as ToastType } from "~/lib/toast-store";

function makeToast(overrides: Partial<ToastType> = {}): ToastType {
  return {
    id: "t-1",
    heading: "Couldn't save",
    description: "buy milk",
    onRetry: vi.fn(),
    ...overrides,
  };
}

describe("Toast", () => {
  it("renders heading, single-quoted description, Retry, and Dismiss", () => {
    render(<Toast toast={makeToast()} onDismiss={vi.fn()} />);
    expect(screen.getByText("Couldn't save")).toBeInTheDocument();
    expect(screen.getByText("'buy milk'")).toBeInTheDocument();
    expect(screen.getByTestId("toast-retry")).toBeInTheDocument();
    expect(screen.getByLabelText("Dismiss")).toBeInTheDocument();
  });

  it("truncates description >40 chars with ellipsis", () => {
    const long = "x".repeat(50);
    render(
      <Toast
        toast={makeToast({ description: long })}
        onDismiss={vi.fn()}
      />,
    );
    // 39 chars + ellipsis = 40 chars total visible
    expect(screen.getByText(`'${"x".repeat(39)}…'`)).toBeInTheDocument();
  });

  it("does not truncate descriptions ≤40 chars", () => {
    const short = "x".repeat(40);
    render(
      <Toast
        toast={makeToast({ description: short })}
        onDismiss={vi.fn()}
      />,
    );
    expect(screen.getByText(`'${short}'`)).toBeInTheDocument();
  });

  it("calls onRetry then onDismiss when Retry is clicked", async () => {
    const onRetry = vi.fn();
    const onDismiss = vi.fn();
    render(
      <Toast toast={makeToast({ onRetry })} onDismiss={onDismiss} />,
    );
    await userEvent.click(screen.getByTestId("toast-retry"));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("calls onDismiss when × is clicked", async () => {
    const onDismiss = vi.fn();
    render(<Toast toast={makeToast()} onDismiss={onDismiss} />);
    await userEvent.click(screen.getByLabelText("Dismiss"));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("has role=status, aria-live=polite, aria-atomic=true", () => {
    render(<Toast toast={makeToast()} onDismiss={vi.fn()} />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveAttribute("aria-atomic", "true");
  });

  it("Retry button's aria-label includes the truncated description", () => {
    const long = "x".repeat(50);
    render(
      <Toast
        toast={makeToast({ description: long })}
        onDismiss={vi.fn()}
      />,
    );
    const retry = screen.getByTestId("toast-retry");
    expect(retry).toHaveAttribute("aria-label", `Retry: ${"x".repeat(39)}…`);
  });
});

describe("truncate helper", () => {
  it("returns input unchanged when short", () => {
    expect(truncate("hello", 40)).toBe("hello");
  });
  it("returns N-1 chars + ellipsis when too long", () => {
    expect(truncate("x".repeat(50), 40)).toBe("x".repeat(39) + "…");
  });
});
