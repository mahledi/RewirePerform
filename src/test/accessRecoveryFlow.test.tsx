import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import type { Session } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { MinorAuthorizationProvider } from "@/contexts/MinorAuthorizationContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import MinorAuthorizationGate from "@/components/minor-consent/MinorAuthorizationGate";

type QueryResult = {
  data: Record<string, unknown> | null;
  error: Error | null;
};

const mocks = vi.hoisted(() => ({
  authCallback: null as ((event: string, session: Session | null) => void) | null,
  from: vi.fn(),
  invoke: vi.fn(),
  refreshSession: vi.fn(),
  unsubscribe: vi.fn(),
  roleResults: [] as Array<QueryResult | Promise<QueryResult>>,
  profileResults: [] as Array<QueryResult | Promise<QueryResult>>,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn((callback) => {
        mocks.authCallback = callback;
        return { data: { subscription: { unsubscribe: mocks.unsubscribe } } };
      }),
      refreshSession: mocks.refreshSession,
      signOut: vi.fn(),
    },
    from: mocks.from,
    functions: { invoke: mocks.invoke },
  },
}));

const session = { user: { id: "athlete-a" } } as Session;

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
};

const AuthStateProbe = () => {
  const { role, isTestUser } = useAuth();
  return (
    <output data-testid="auth-state">
      {`${role ?? "none"}|${isTestUser ? "test" : "real"}`}
    </output>
  );
};

describe("native access recovery flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    window.localStorage.setItem("cached_user_role:athlete-a", "athlete");
    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: false });

    mocks.roleResults = [{ data: { role: "athlete" }, error: null }];
    mocks.profileResults = [{ data: { is_test_user: false }, error: null }];
    mocks.refreshSession.mockResolvedValue({ data: { session }, error: null });
    mocks.from.mockImplementation((table: string) => {
      const queryBuilder = {
        select: () => queryBuilder,
        eq: () => queryBuilder,
        retry: () => queryBuilder,
        abortSignal: () => queryBuilder,
        maybeSingle: () => Promise.resolve(
          table === "user_roles"
            ? mocks.roleResults.shift()
            : mocks.profileResults.shift(),
        ),
      };
      return queryBuilder;
    });
    mocks.invoke.mockResolvedValue({
      data: {
        state: "product_authorized",
        product_status: "authorized",
      },
      error: null,
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: true });
  });

  it("recovers automatically after an offline cold start without reloading the app", async () => {
    let resolveAuthorization!: (value: {
      data: { state: string; product_status: string };
      error: null;
    }) => void;
    mocks.invoke.mockReturnValueOnce(new Promise((resolve) => {
      resolveAuthorization = resolve;
    }));

    render(
      <AuthProvider>
        <MinorAuthorizationProvider>
          <MemoryRouter initialEntries={["/dashboard"]}>
            <ProtectedRoute>
              <MinorAuthorizationGate>
                <div>Dashboard bereit</div>
              </MinorAuthorizationGate>
            </ProtectedRoute>
          </MemoryRouter>
        </MinorAuthorizationProvider>
      </AuthProvider>,
    );

    act(() => mocks.authCallback?.("INITIAL_SESSION", session));

    await waitFor(() => expect(
      screen.getByRole("heading", { name: "Rolle konnte nicht sicher geprüft werden" }),
    ).toBeInTheDocument());
    expect(document.querySelector('img[src="/brand/rewireperform-symbol-dark.svg"]'))
      .toBeInTheDocument();

    // WKWebView can emit `online` before navigator.onLine reflects the restored
    // connection. A real request must decide whether recovery succeeded.
    act(() => window.dispatchEvent(new Event("online")));

    await waitFor(() => expect(
      screen.getByRole("status"),
    ).toHaveTextContent("Zugang wird geprüft"));
    expect(screen.queryByRole("heading", { name: "Zugang wird geprüft" }))
      .not.toBeInTheDocument();
    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledTimes(1));
    expect(document.querySelector('img[src="/brand/rewireperform-symbol-dark.svg"]'))
      .toBeInTheDocument();

    await act(async () => resolveAuthorization({
      data: {
        state: "product_authorized",
        product_status: "authorized",
      },
      error: null,
    }));

    await waitFor(() => expect(screen.getByText("Dashboard bereit")).toBeInTheDocument(), {
      timeout: 2_500,
    });
    expect(mocks.from).toHaveBeenCalledTimes(2);
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
  });

  it("starts a fresh role request when the first WebView request never settles after abort", async () => {
    vi.useFakeTimers();
    const firstRole = deferred<QueryResult>();
    const firstProfile = deferred<QueryResult>();
    mocks.roleResults = [
      firstRole.promise,
      { data: { role: "athlete" }, error: null },
    ];
    mocks.profileResults = [
      firstProfile.promise,
      { data: { is_test_user: false }, error: null },
    ];

    render(
      <AuthProvider>
        <MinorAuthorizationProvider>
          <MemoryRouter initialEntries={["/dashboard"]}>
            <ProtectedRoute>
              <MinorAuthorizationGate>
                <div>Dashboard bereit</div>
                <AuthStateProbe />
              </MinorAuthorizationGate>
            </ProtectedRoute>
          </MemoryRouter>
        </MinorAuthorizationProvider>
      </AuthProvider>,
    );

    act(() => mocks.authCallback?.("INITIAL_SESSION", session));
    await act(async () => Promise.resolve());
    expect(screen.getByRole("heading", { name: "Rolle konnte nicht sicher geprüft werden" }))
      .toBeInTheDocument();

    act(() => window.dispatchEvent(new Event("online")));
    await act(async () => vi.advanceTimersByTimeAsync(500));
    expect(mocks.from).toHaveBeenCalledTimes(2);

    // The first request pair never resolves, even after AbortController.abort().
    // Recovery must still leave that attempt and start one fresh request pair.
    await act(async () => vi.advanceTimersByTimeAsync(3_000));
    expect(mocks.from).toHaveBeenCalledTimes(4);
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Dashboard bereit")).toBeInTheDocument();
    expect(screen.getByTestId("auth-state")).toHaveTextContent("athlete|real");

    await act(async () => {
      firstRole.resolve({ data: { role: "admin" }, error: null });
      firstProfile.resolve({ data: { is_test_user: true }, error: null });
      await Promise.all([firstRole.promise, firstProfile.promise]);
    });

    expect(screen.getByTestId("auth-state")).toHaveTextContent("athlete|real");
    expect(window.localStorage.getItem("cached_user_role:athlete-a")).toBe("athlete");
  });

  it("recovers when both the first role and first authorization request stay pending", async () => {
    vi.useFakeTimers();
    const firstRole = deferred<QueryResult>();
    const firstProfile = deferred<QueryResult>();
    const firstAuthorization = deferred<{
      data: { state: string; product_status: string };
      error: null;
    }>();
    mocks.roleResults = [
      firstRole.promise,
      { data: { role: "athlete" }, error: null },
    ];
    mocks.profileResults = [
      firstProfile.promise,
      { data: { is_test_user: false }, error: null },
    ];
    mocks.invoke
      .mockReturnValueOnce(firstAuthorization.promise)
      .mockResolvedValueOnce({
        data: {
          state: "product_authorized",
          product_status: "authorized",
        },
        error: null,
      });

    render(
      <AuthProvider>
        <MinorAuthorizationProvider>
          <MemoryRouter initialEntries={["/dashboard"]}>
            <ProtectedRoute>
              <MinorAuthorizationGate>
                <div>Dashboard bereit</div>
              </MinorAuthorizationGate>
            </ProtectedRoute>
          </MemoryRouter>
        </MinorAuthorizationProvider>
      </AuthProvider>,
    );

    act(() => mocks.authCallback?.("INITIAL_SESSION", session));
    await act(async () => Promise.resolve());
    expect(screen.getByRole("heading", { name: "Rolle konnte nicht sicher geprüft werden" }))
      .toBeInTheDocument();

    act(() => window.dispatchEvent(new Event("online")));
    await act(async () => vi.advanceTimersByTimeAsync(500));
    expect(mocks.from).toHaveBeenCalledTimes(2);

    await act(async () => vi.advanceTimersByTimeAsync(3_000));
    expect(mocks.from).toHaveBeenCalledTimes(4);
    expect(mocks.invoke).toHaveBeenCalledTimes(1);

    await act(async () => vi.advanceTimersByTimeAsync(3_000));
    expect(mocks.invoke).toHaveBeenCalledTimes(2);
    expect(screen.getByText("Dashboard bereit")).toBeInTheDocument();
  });
});
