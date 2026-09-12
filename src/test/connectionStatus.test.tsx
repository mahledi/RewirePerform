import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ConnectionStatus from "@/components/ConnectionStatus";

const setNavigatorOnline = (online: boolean) => {
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    value: online,
  });
};

describe("ConnectionStatus", () => {
  afterEach(() => {
    vi.useRealTimers();
    setNavigatorOnline(true);
  });

  it("renders the initial offline status as a polite live region", () => {
    setNavigatorOnline(false);

    render(<ConnectionStatus />);

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveAttribute("aria-atomic", "true");
    expect(status).toHaveTextContent(
      "Offline. Deine Eingaben bleiben auf diesem Gerät gesichert."
    );
  });

  it("announces an offline transition politely", () => {
    setNavigatorOnline(true);
    render(<ConnectionStatus />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new Event("offline"));
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      "Offline. Deine Eingaben bleiben auf diesem Gerät gesichert."
    );
  });

  it("announces restored online connectivity politely", () => {
    vi.useFakeTimers();
    setNavigatorOnline(false);
    render(<ConnectionStatus />);

    act(() => {
      window.dispatchEvent(new Event("online"));
    });

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveTextContent("Verbindung wiederhergestellt.");

    act(() => {
      vi.advanceTimersByTime(2200);
    });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("hides the decorative wifi icon from screen readers", () => {
    setNavigatorOnline(false);

    render(<ConnectionStatus />);

    const icon = document.querySelector("svg");
    expect(icon).toHaveAttribute("aria-hidden", "true");
  });
});
