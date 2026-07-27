import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MinorAuthorizationProvider } from "@/contexts/MinorAuthorizationContext";
import { useMinorAuthorization } from "@/hooks/useMinorAuthorization";
import { accessFailure, type AccessFailureCode } from "@/lib/accessRecovery";
import { MinorAuthorizationError } from "@/lib/minorAuthorization";

const mocks = vi.hoisted(() => ({
  auth: {
    user: { id: "athlete-a" } as { id: string } | null,
    role: "athlete" as "athlete" | "coach" | "admin" | null,
    roleVerified: true,
    loading: false,
  },
  native: false,
  appStateListener: null as ((state: { isActive: boolean }) => void) | null,
  removeAppStateListener: vi.fn(),
  getStatus: vi.fn(),
  refreshSession: vi.fn(),
  verifyRole: vi.fn(),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () => mocks.native,
  },
}));

vi.mock("@capacitor/app", () => ({
  App: {
    addListener: vi.fn(async (
      event: string,
      listener: (state: { isActive: boolean }) => void,
    ) => {
      if (event === "appStateChange") mocks.appStateListener = listener;
      return { remove: mocks.removeAppStateListener };
    }),
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    ...mocks.auth,
    verifyRole: mocks.verifyRole,
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { refreshSession: mocks.refreshSession },
  },
}));

vi.mock("@/lib/minorAuthorization", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/minorAuthorization")>();
  return {
    ...original,
    getMinorAuthorizationStatus: mocks.getStatus,
  };
});

const authorized = {
  state: "product_authorized",
  product_status: "authorized",
} as const;
const guardianPending = {
  state: "guardian_pending",
  product_status: "pending",
} as const;

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, reject, resolve };
};

const failure = (code: AccessFailureCode, retryable: boolean, status?: number) =>
  new MinorAuthorizationError(code, accessFailure(code, retryable, status));

const Probe = () => {
  const { status, loading, phase, error } = useMinorAuthorization();
  return (
    <output data-testid="minor-status">
      {`${status?.product_status ?? "none"}|${loading ? "loading" : "ready"}|${phase}|${error ?? "no-error"}`}
    </output>
  );
};

describe("minor authorization reconnect recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.user = { id: "athlete-a" };
    mocks.auth.role = "athlete";
    mocks.auth.roleVerified = true;
    mocks.auth.loading = false;
    mocks.native = false;
    mocks.appStateListener = null;
    mocks.verifyRole.mockResolvedValue({ ok: true, value: "athlete" });
    mocks.refreshSession.mockResolvedValue({ data: { session: {} }, error: null });
    mocks.getStatus.mockResolvedValue(authorized);
    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: true });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: true });
  });

  it("checks a verified athlete even when the browser online hint is stale", async () => {
    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: false });

    render(<MinorAuthorizationProvider><Probe /></MinorAuthorizationProvider>);

    await waitFor(() => expect(mocks.getStatus).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByTestId("minor-status")).toHaveTextContent(
      "authorized|ready|ready|no-error",
    ));
  });

  it("coalesces online, focus, pageshow and visibility events into one request", async () => {
    const request = deferred<typeof authorized>();
    mocks.getStatus.mockReturnValueOnce(request.promise);

    render(<MinorAuthorizationProvider><Probe /></MinorAuthorizationProvider>);
    await waitFor(() => expect(mocks.getStatus).toHaveBeenCalledTimes(1));

    act(() => {
      window.dispatchEvent(new Event("online"));
      window.dispatchEvent(new Event("focus"));
      window.dispatchEvent(new Event("pageshow"));
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(mocks.getStatus).toHaveBeenCalledTimes(1);

    await act(async () => request.resolve(authorized));
    await waitFor(() => expect(screen.getByTestId("minor-status")).toHaveTextContent(
      "authorized|ready|ready|no-error",
    ));
  });

  it("refreshes a cached guardian-pending state immediately when the app regains focus", async () => {
    const refreshed = deferred<typeof authorized>();
    mocks.getStatus
      .mockResolvedValueOnce(guardianPending)
      .mockReturnValueOnce(refreshed.promise);

    render(<MinorAuthorizationProvider><Probe /></MinorAuthorizationProvider>);
    await waitFor(() => expect(screen.getByTestId("minor-status")).toHaveTextContent(
      "pending|ready|ready|no-error",
    ));

    act(() => window.dispatchEvent(new Event("focus")));

    await waitFor(() => expect(mocks.getStatus).toHaveBeenCalledTimes(2), { timeout: 2_000 });
    expect(screen.getByTestId("minor-status")).toHaveTextContent(
      "pending|loading|checking_authorization|no-error",
    );
    await act(async () => refreshed.resolve(authorized));
    await waitFor(() => expect(screen.getByTestId("minor-status")).toHaveTextContent(
      "authorized|ready|ready|no-error",
    ));
  });

  it("refreshes a cached guardian-pending state when the native app becomes active", async () => {
    mocks.native = true;
    mocks.getStatus
      .mockResolvedValueOnce(guardianPending)
      .mockResolvedValueOnce(authorized);

    render(<MinorAuthorizationProvider><Probe /></MinorAuthorizationProvider>);
    await waitFor(() => expect(screen.getByTestId("minor-status")).toHaveTextContent(
      "pending|ready|ready|no-error",
    ));
    await waitFor(() => expect(mocks.appStateListener).not.toBeNull());

    act(() => mocks.appStateListener?.({ isActive: true }));

    await waitFor(() => expect(mocks.getStatus).toHaveBeenCalledTimes(2), { timeout: 2_000 });
    await waitFor(() => expect(screen.getByTestId("minor-status")).toHaveTextContent(
      "authorized|ready|ready|no-error",
    ));
  });

  it("retries one timed-out role check after connectivity returns", async () => {
    vi.useFakeTimers();
    mocks.auth.roleVerified = false;
    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: false });
    const firstRoleAttempt = deferred<ReturnType<typeof accessFailure>>();
    const secondRoleAttempt = deferred<{ ok: true; value: "athlete" }>();
    mocks.verifyRole
      .mockReturnValueOnce(firstRoleAttempt.promise.then((failureResult) => ({
        ok: false as const,
        failure: failureResult,
      })))
      .mockReturnValueOnce(secondRoleAttempt.promise);

    render(<MinorAuthorizationProvider><Probe /></MinorAuthorizationProvider>);
    await act(async () => Promise.resolve());
    expect(screen.getByTestId("minor-status")).toHaveTextContent(
      "none|ready|failed|offline",
    );

    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: true });
    act(() => window.dispatchEvent(new Event("online")));
    await act(async () => vi.advanceTimersByTimeAsync(500));
    expect(mocks.verifyRole).toHaveBeenCalledTimes(1);
    expect(mocks.verifyRole).toHaveBeenCalledWith(expect.any(AbortSignal));

    await act(async () => vi.advanceTimersByTimeAsync(2_500));
    await act(async () => firstRoleAttempt.resolve(accessFailure("timeout", true)));
    await act(async () => vi.advanceTimersByTimeAsync(500));
    expect(mocks.verifyRole).toHaveBeenCalledTimes(2);

    await act(async () => vi.advanceTimersByTimeAsync(2_500));
    await act(async () => secondRoleAttempt.resolve({ ok: true, value: "athlete" }));
    await act(async () => Promise.resolve());

    expect(mocks.getStatus).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("minor-status")).toHaveTextContent(
      "authorized|ready|ready|no-error",
    );
  });

  it("ends a lifecycle recovery whose role call never settles", async () => {
    vi.useFakeTimers();
    mocks.auth.roleVerified = false;
    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: false });
    mocks.verifyRole.mockReturnValueOnce(new Promise(() => undefined));

    render(<MinorAuthorizationProvider><Probe /></MinorAuthorizationProvider>);
    await act(async () => Promise.resolve());
    expect(screen.getByTestId("minor-status")).toHaveTextContent(
      "none|ready|failed|offline",
    );

    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: true });
    act(() => window.dispatchEvent(new Event("online")));
    await act(async () => vi.advanceTimersByTimeAsync(500));
    expect(mocks.verifyRole).toHaveBeenCalledTimes(1);

    await act(async () => vi.advanceTimersByTimeAsync(12_500));
    expect(screen.getByTestId("minor-status")).toHaveTextContent(
      "none|ready|failed|timeout",
    );
    expect(mocks.getStatus).not.toHaveBeenCalled();
  });

  it.each([
    ["timeout", undefined],
    ["rate_limited", 429],
    ["service_unavailable", 503],
  ] as const)("retries %s exactly once", async (code, status) => {
    vi.useFakeTimers();
    mocks.getStatus
      .mockRejectedValueOnce(failure(code, true, status))
      .mockResolvedValueOnce(authorized);

    render(<MinorAuthorizationProvider><Probe /></MinorAuthorizationProvider>);
    await act(async () => Promise.resolve());
    expect(mocks.getStatus).toHaveBeenCalledTimes(1);

    await act(async () => vi.advanceTimersByTimeAsync(500));
    expect(mocks.getStatus).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("minor-status")).toHaveTextContent(
      "authorized|ready|ready|no-error",
    );
  });

  it("refreshes the session once after 401 and then retries once", async () => {
    mocks.getStatus
      .mockRejectedValueOnce(failure("unauthorized", false, 401))
      .mockResolvedValueOnce(authorized);

    render(<MinorAuthorizationProvider><Probe /></MinorAuthorizationProvider>);

    await waitFor(() => expect(screen.getByTestId("minor-status")).toHaveTextContent(
      "authorized|ready|ready|no-error",
    ));
    expect(mocks.refreshSession).toHaveBeenCalledTimes(1);
    expect(mocks.getStatus).toHaveBeenCalledTimes(2);
  });

  it("ends a hanging session refresh at the shared nine-second deadline", async () => {
    vi.useFakeTimers();
    mocks.getStatus.mockRejectedValueOnce(failure("unauthorized", false, 401));
    mocks.refreshSession.mockReturnValueOnce(new Promise(() => undefined));

    render(<MinorAuthorizationProvider><Probe /></MinorAuthorizationProvider>);
    await act(async () => Promise.resolve());
    expect(mocks.getStatus).toHaveBeenCalledTimes(1);
    expect(mocks.refreshSession).toHaveBeenCalledTimes(1);

    await act(async () => vi.advanceTimersByTimeAsync(9_000));
    expect(screen.getByTestId("minor-status")).toHaveTextContent(
      "none|ready|failed|timeout",
    );
    expect(mocks.refreshSession).toHaveBeenCalledTimes(1);
    expect(mocks.getStatus).toHaveBeenCalledTimes(1);
  });

  it("does not retry or refresh after 403", async () => {
    mocks.getStatus.mockRejectedValueOnce(failure("forbidden", false, 403));

    render(<MinorAuthorizationProvider><Probe /></MinorAuthorizationProvider>);

    await waitFor(() => expect(screen.getByTestId("minor-status")).toHaveTextContent(
      "none|ready|failed|forbidden",
    ));
    expect(mocks.getStatus).toHaveBeenCalledTimes(1);
    expect(mocks.refreshSession).not.toHaveBeenCalled();
  });

  it("ends a hanging recovery as a visible timeout after nine seconds", async () => {
    vi.useFakeTimers();
    mocks.getStatus.mockImplementationOnce(({ signal }: { signal: AbortSignal }) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => {
          reject(failure("aborted", false));
        }, { once: true });
      }));

    render(<MinorAuthorizationProvider><Probe /></MinorAuthorizationProvider>);
    await act(async () => Promise.resolve());
    expect(mocks.getStatus).toHaveBeenCalledTimes(1);

    await act(async () => vi.advanceTimersByTimeAsync(9_000));
    expect(screen.getByTestId("minor-status")).toHaveTextContent(
      "none|ready|failed|timeout",
    );
  });

  it("does not let a late failure from the previous user overwrite a later success", async () => {
    const firstUserRequest = deferred<typeof authorized>();
    mocks.getStatus
      .mockReturnValueOnce(firstUserRequest.promise)
      .mockResolvedValueOnce(authorized);

    const view = render(<MinorAuthorizationProvider><Probe /></MinorAuthorizationProvider>);
    await waitFor(() => expect(mocks.getStatus).toHaveBeenCalledTimes(1));

    mocks.auth.user = { id: "athlete-b" };
    view.rerender(<MinorAuthorizationProvider><Probe /></MinorAuthorizationProvider>);
    await waitFor(() => expect(mocks.getStatus).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByTestId("minor-status")).toHaveTextContent(
      "authorized|ready|ready|no-error",
    ));

    await act(async () => firstUserRequest.reject(failure("aborted", false)));
    expect(screen.getByTestId("minor-status")).toHaveTextContent(
      "authorized|ready|ready|no-error",
    );
  });

  it.each(["coach", "admin"] as const)("bypasses the minor check for %s", async (role) => {
    mocks.auth.role = role;

    render(<MinorAuthorizationProvider><Probe /></MinorAuthorizationProvider>);

    await waitFor(() => expect(screen.getByTestId("minor-status")).toHaveTextContent(
      "none|ready|ready|no-error",
    ));
    expect(mocks.getStatus).not.toHaveBeenCalled();
  });
});
