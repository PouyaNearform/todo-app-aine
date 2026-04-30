import { act, render, screen } from "@testing-library/react";
import {
  ToastProvider,
  useDismissToast,
  useShowToast,
  useToasts,
  type Toast,
} from "./toast-store";

function TestList() {
  const toasts = useToasts();
  return (
    <ul data-testid="toasts">
      {toasts.map((t) => (
        <li key={t.id}>{t.heading}</li>
      ))}
    </ul>
  );
}

function ShowButton({ toast }: { toast: Toast }) {
  const show = useShowToast();
  return (
    <button data-testid="show" onClick={() => show(toast)}>
      show
    </button>
  );
}

function DismissButton({ id }: { id: string }) {
  const dismiss = useDismissToast();
  return (
    <button data-testid="dismiss" onClick={() => dismiss(id)}>
      dismiss
    </button>
  );
}

const makeToast = (overrides: Partial<Toast> = {}): Toast => ({
  id: crypto.randomUUID(),
  heading: "Couldn't save",
  description: "buy milk",
  onRetry: () => {},
  ...overrides,
});

describe("toast-store", () => {
  it("provider supplies empty toasts by default", () => {
    render(
      <ToastProvider>
        <TestList />
      </ToastProvider>,
    );
    expect(screen.getByTestId("toasts").children).toHaveLength(0);
  });

  it("useShowToast adds a toast", () => {
    const t = makeToast({ heading: "Couldn't save A" });
    render(
      <ToastProvider>
        <TestList />
        <ShowButton toast={t} />
      </ToastProvider>,
    );
    act(() => screen.getByTestId("show").click());
    expect(screen.getByText("Couldn't save A")).toBeInTheDocument();
  });

  it("useDismissToast removes the matching toast", () => {
    const t = makeToast({ heading: "to dismiss" });
    render(
      <ToastProvider>
        <TestList />
        <ShowButton toast={t} />
        <DismissButton id={t.id} />
      </ToastProvider>,
    );
    act(() => screen.getByTestId("show").click());
    expect(screen.getByText("to dismiss")).toBeInTheDocument();
    act(() => screen.getByTestId("dismiss").click());
    expect(screen.queryByText("to dismiss")).toBeNull();
  });

  it("multiple toasts coexist", () => {
    const a = makeToast({ heading: "first" });
    const b = makeToast({ heading: "second" });
    render(
      <ToastProvider>
        <TestList />
        <ShowButton toast={a} />
        <ShowButton toast={b} />
      </ToastProvider>,
    );
    const showButtons = screen.getAllByTestId("show");
    act(() => showButtons[0].click());
    act(() => showButtons[1].click());
    expect(screen.getByText("first")).toBeInTheDocument();
    expect(screen.getByText("second")).toBeInTheDocument();
  });

  it("hooks throw when used outside provider", () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<TestList />)).toThrow(
      /Toast hooks must be used inside ToastProvider/,
    );
    errSpy.mockRestore();
  });
});
