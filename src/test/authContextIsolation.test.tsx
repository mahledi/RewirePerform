import { act, render, screen, waitFor } from "@testing-library/react";
import type { Session } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

type QueryResult = { data: Record<string, unknown> | null; error: Error | null };

const mocks = vi.hoisted(() => ({
  authCallback: null as ((event: string, session: Session | null) => void) | null,
  contextQueries: new Map<string, Promise<QueryResult>>(),
  from: vi.fn(),
  signOut: vi.fn(),
  unsubscribe: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn((callback) => {
        mocks.authCallback = callback;
        return { data: { subscription: { unsubscribe: mocks.unsubscribe } } };
      }),
      signOut: mocks.signOut,
    },
    from: mocks.from,
  },
}));

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
};

const sessionFor = (userId: string) => ({ user: { id: userId } }) as Session;

const Probe = () => {
  const { user, role, isTestUser, loading } = useAuth();
  return (
    <output data-testid="auth-state">
      {`${user?.id ?? "none"}|${role ?? "none"}|${isTestUser ? "test" : "real"}|${loading ? "loading" : "ready"}`}
    </output>
  );
};

const emitAuth = (event: string, session: Session | null) => {
  act(() => {
    mocks.authCallback?.(event, session);
  });
};

describe("AuthProvider session isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mocks.authCallback = null;
    mocks.contextQueries.clear();
    mocks.signOut.mockResolvedValue({ error: null });
    mocks.from.mockImplementation((table: string) => ({
      select: () => ({
        eq: (_column: string, userId: string) => ({
          maybeSingle: () => {
            const query = mocks.contextQueries.get(`${table}:${userId}`);
            if (!query) throw new Error(`Missing mocked query for ${table}:${userId}`);
            return query;
          },
        }),
      }),
    }));
  });

  it("ignores a previous user's context when accounts switch", async () => {
    const roleA = deferred<QueryResult>();
    const profileA = deferred<QueryResult>();
    const roleB = deferred<QueryResult>();
    const profileB = deferred<QueryResult>();
    mocks.contextQueries.set("user_roles:user-a", roleA.promise);
    mocks.contextQueries.set("profiles:user-a", profileA.promise);
    mocks.contextQueries.set("user_roles:user-b", roleB.promise);
    mocks.contextQueries.set("profiles:user-b", profileB.promise);

    render(<AuthProvider><Probe /></AuthProvider>);
    emitAuth("SIGNED_IN", sessionFor("user-a"));
    await waitFor(() => expect(mocks.from).toHaveBeenCalledTimes(2));
    emitAuth("SIGNED_IN", sessionFor("user-b"));
    await waitFor(() => expect(mocks.from).toHaveBeenCalledTimes(4));

    await act(async () => {
      roleB.resolve({ data: { role: "coach" }, error: null });
      profileB.resolve({ data: { is_test_user: false }, error: null });
      await Promise.all([roleB.promise, profileB.promise]);
    });
    await waitFor(() => expect(screen.getByTestId("auth-state")).toHaveTextContent("user-b|coach|real|ready"));

    await act(async () => {
      roleA.resolve({ data: { role: "admin" }, error: null });
      profileA.resolve({ data: { is_test_user: true }, error: null });
      await Promise.all([roleA.promise, profileA.promise]);
    });

    expect(screen.getByTestId("auth-state")).toHaveTextContent("user-b|coach|real|ready");
  });

  it("does not restore role or test status after sign-out", async () => {
    const role = deferred<QueryResult>();
    const profile = deferred<QueryResult>();
    mocks.contextQueries.set("user_roles:user-a", role.promise);
    mocks.contextQueries.set("profiles:user-a", profile.promise);

    render(<AuthProvider><Probe /></AuthProvider>);
    emitAuth("INITIAL_SESSION", sessionFor("user-a"));
    await waitFor(() => expect(mocks.from).toHaveBeenCalledTimes(2));
    emitAuth("SIGNED_OUT", null);

    await act(async () => {
      role.resolve({ data: { role: "admin" }, error: null });
      profile.resolve({ data: { is_test_user: true }, error: null });
      await Promise.all([role.promise, profile.promise]);
    });

    await waitFor(() => expect(screen.getByTestId("auth-state")).toHaveTextContent("none|none|real|ready"));
  });
});
