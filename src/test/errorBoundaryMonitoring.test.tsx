import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  captureAppError: vi.fn(),
}));

vi.mock("@/lib/monitoring", () => ({
  captureAppError: mocks.captureAppError,
}));

import ErrorBoundary from "@/components/ErrorBoundary";

const BrokenChild = () => {
  throw new Error("private render detail");
};

describe("ErrorBoundary monitoring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reports a normalized runtime incident through the internal path", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <BrokenChild />
      </ErrorBoundary>,
    );

    expect(screen.getByRole("heading", { name: "Etwas ist schiefgelaufen" })).toBeInTheDocument();
    expect(mocks.captureAppError).toHaveBeenCalledTimes(1);
    expect(mocks.captureAppError).toHaveBeenCalledWith({
      eventName: "app_runtime_error",
      error: expect.any(Error),
      metadata: { source: "error_boundary" },
    });

    consoleError.mockRestore();
  });
});
