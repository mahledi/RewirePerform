import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  accessFailure,
  classifyGenericAccessFailure,
  type AccessStepResult,
} from "@/lib/accessRecovery";

export type VerifiedAppRole = "athlete" | "coach" | "admin";
type AppRole = VerifiedAppRole | null;

const ROLE_CONTEXT_TIMEOUT_MS = 2_500;

const roleCacheKey = (userId: string) => `cached_user_role:${userId}`;

const readCachedRole = (userId: string): AppRole => {
  try {
    const cached = window.localStorage.getItem(roleCacheKey(userId));
    return cached === "athlete" || cached === "coach" || cached === "admin" ? cached : null;
  } catch {
    return null;
  }
};

const writeCachedRole = (userId: string, nextRole: AppRole) => {
  if (!nextRole) return;
  try {
    window.localStorage.setItem(roleCacheKey(userId), nextRole);
    window.localStorage.setItem("cached_user_role", nextRole);
    window.localStorage.setItem("cached_user_id", userId);
  } catch {
    // WKWebView can temporarily deny storage while resuming from a Universal Link.
    // Role verification remains authoritative and must not crash the auth route.
  }
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: AppRole;
  roleVerified: boolean;
  roleLoading: boolean;
  isTestUser: boolean;
  verifyRole: (
    signal?: AbortSignal,
    timeoutMs?: number,
  ) => Promise<AccessStepResult<VerifiedAppRole>>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  role: null,
  roleVerified: false,
  roleLoading: false,
  isTestUser: false,
  verifyRole: async () => ({ ok: false, failure: accessFailure("role_missing", false) }),
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const user = session?.user ?? null;
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<AppRole>(null);
  const [roleVerified, setRoleVerified] = useState(false);
  const [roleLoading, setRoleLoading] = useState(false);
  const [isTestUser, setIsTestUser] = useState(false);
  const activeUserIdRef = useRef<string | null>(null);
  const authGenerationRef = useRef(0);
  const contextRequestSequenceRef = useRef(0);
  const contextInFlightRef = useRef<{
    userId: string;
    generation: number;
    controller: AbortController;
    promise: Promise<AccessStepResult<VerifiedAppRole>>;
  } | null>(null);

  const fetchUserContext = useCallback((
    userId: string,
    generation: number,
    options: {
      forceNetworkProbe?: boolean;
      signal?: AbortSignal;
      timeoutMs?: number;
    } = {},
  ): Promise<AccessStepResult<VerifiedAppRole>> => {
    const isCurrentSession = () =>
      activeUserIdRef.current === userId && authGenerationRef.current === generation;

    if (!isCurrentSession()) {
      return Promise.resolve({ ok: false, failure: accessFailure("aborted", false) });
    }

    const existing = contextInFlightRef.current;
    if (
      existing?.userId === userId
      && existing.generation === generation
      && !existing.controller.signal.aborted
    ) {
      return existing.promise;
    }
    existing?.controller.abort();

    if (!options.forceNetworkProbe && !window.navigator.onLine) {
      setRole(readCachedRole(userId));
      setRoleVerified(false);
      setRoleLoading(false);
      return Promise.resolve({ ok: false, failure: accessFailure("offline", true) });
    }

    const controller = new AbortController();
    const requestSequence = ++contextRequestSequenceRef.current;
    const isCurrentContext = () =>
      isCurrentSession() && contextRequestSequenceRef.current === requestSequence;
    let timedOut = false;
    let externallyAborted = options.signal?.aborted ?? false;
    const handleExternalAbort = () => {
      externallyAborted = true;
      controller.abort();
    };
    options.signal?.addEventListener("abort", handleExternalAbort, { once: true });

    const request = (async (): Promise<AccessStepResult<VerifiedAppRole>> => {
      setRoleLoading(true);
      let removeControllerAbortListener = () => undefined;
      const interrupted = new Promise<AccessStepResult<{
        role: VerifiedAppRole;
        isTestUser: boolean;
      }>>((resolve) => {
        const handleControllerAbort = () => {
          resolve({
            ok: false,
            failure: timedOut
              ? accessFailure("timeout", true)
              : accessFailure("aborted", false),
          });
        };
        if (controller.signal.aborted) {
          handleControllerAbort();
          return;
        }
        controller.signal.addEventListener("abort", handleControllerAbort, { once: true });
        removeControllerAbortListener = () =>
          controller.signal.removeEventListener("abort", handleControllerAbort);
      });

      const timeoutId = window.setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, options.timeoutMs ?? ROLE_CONTEXT_TIMEOUT_MS);

      try {
        const networkResult = (async (): Promise<AccessStepResult<{
          role: VerifiedAppRole;
          isTestUser: boolean;
        }>> => {
          try {
            const [
              { data: roleData, error: roleError },
              { data: profileData, error: profileError },
            ] = await Promise.all([
              supabase
                .from("user_roles")
                .select("role")
                .eq("user_id", userId)
                .retry(false)
                .abortSignal(controller.signal)
                .maybeSingle(),
              supabase
                .from("profiles")
                .select("is_test_user")
                .eq("id", userId)
                .retry(false)
                .abortSignal(controller.signal)
                .maybeSingle(),
            ]);
            if (roleError) throw roleError;
            if (profileError) throw profileError;

            const nextRole = roleData?.role;
            if (nextRole !== "athlete" && nextRole !== "coach" && nextRole !== "admin") {
              return { ok: false, failure: accessFailure("role_missing", false) };
            }

            return {
              ok: true,
              value: {
                role: nextRole,
                isTestUser: Boolean(profileData?.is_test_user),
              },
            };
          } catch (error) {
            return {
              ok: false,
              failure: classifyGenericAccessFailure({
                error,
                timedOut,
                externallyAborted,
                online: window.navigator.onLine,
              }),
            };
          }
        });

        if (externallyAborted) controller.abort();
        const result = await Promise.race([networkResult(), interrupted]);

        if (!isCurrentContext() || controller.signal.aborted) {
          return {
            ok: false,
            failure: timedOut
              ? accessFailure("timeout", true)
              : accessFailure("aborted", false),
          };
        }

        if ("failure" in result) {
          setRole(readCachedRole(userId));
          setRoleVerified(false);
          return result;
        }

        setRole(result.value.role);
        setRoleVerified(true);
        setIsTestUser(result.value.isTestUser);
        writeCachedRole(userId, result.value.role);
        return { ok: true, value: result.value.role };
      } catch (error) {
        const failure = classifyGenericAccessFailure({
          error,
          timedOut,
          externallyAborted,
          online: window.navigator.onLine,
        });
        if (isCurrentContext()) {
          setRole(readCachedRole(userId));
          setRoleVerified(false);
        }
        return { ok: false, failure };
      } finally {
        window.clearTimeout(timeoutId);
        removeControllerAbortListener();
        options.signal?.removeEventListener("abort", handleExternalAbort);
        if (contextInFlightRef.current?.controller === controller) {
          contextInFlightRef.current = null;
          if (isCurrentContext()) setRoleLoading(false);
        }
      }
    })();

    contextInFlightRef.current = { userId, generation, controller, promise: request };
    return request;
  }, []);

  const verifyRole = useCallback((signal?: AbortSignal, timeoutMs?: number) => {
    const userId = activeUserIdRef.current;
    if (!userId) {
      return Promise.resolve<AccessStepResult<VerifiedAppRole>>({
        ok: false,
        failure: accessFailure("role_missing", false),
      });
    }
    return fetchUserContext(userId, authGenerationRef.current, {
      forceNetworkProbe: true,
      signal,
      timeoutMs,
    });
  }, [fetchUserContext]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      const nextUserId = nextSession?.user.id ?? null;
      if (activeUserIdRef.current !== nextUserId) {
        authGenerationRef.current += 1;
        contextInFlightRef.current?.controller.abort();
        contextInFlightRef.current = null;
        activeUserIdRef.current = nextUserId;
        setRole(nextUserId ? readCachedRole(nextUserId) : null);
        setRoleVerified(false);
        setRoleLoading(false);
        setIsTestUser(false);
        setLoading(Boolean(nextUserId));
      }
      setSession(nextSession);
      setAuthInitialized(true);
    });

    return () => {
      authGenerationRef.current += 1;
      contextInFlightRef.current?.controller.abort();
      contextInFlightRef.current = null;
      subscription.unsubscribe();
    };
  }, []);

  const sessionUserId = session?.user.id ?? null;

  useEffect(() => {
    if (!authInitialized) return;

    const generation = ++authGenerationRef.current;
    contextInFlightRef.current?.controller.abort();
    contextInFlightRef.current = null;
    activeUserIdRef.current = sessionUserId;

    if (!sessionUserId) {
      setRole(null);
      setRoleVerified(false);
      setRoleLoading(false);
      setIsTestUser(false);
      setLoading(false);
      return;
    }

    setRoleVerified(false);
    setRole(readCachedRole(sessionUserId));
    setIsTestUser(false);
    setLoading(true);

    let cancelled = false;
    void fetchUserContext(sessionUserId, generation).finally(() => {
      if (
        !cancelled
        && activeUserIdRef.current === sessionUserId
        && authGenerationRef.current === generation
      ) {
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      const activeRequest = contextInFlightRef.current;
      if (activeRequest?.userId === sessionUserId && activeRequest.generation === generation) {
        activeRequest.controller.abort();
        contextInFlightRef.current = null;
      }
    };
  }, [authInitialized, fetchUserContext, sessionUserId]);

  const signOut = useCallback(async () => {
    const previousUserId = activeUserIdRef.current;
    authGenerationRef.current += 1;
    contextInFlightRef.current?.controller.abort();
    contextInFlightRef.current = null;
    activeUserIdRef.current = null;
    setRole(null);
    setRoleVerified(false);
    setRoleLoading(false);
    setIsTestUser(false);
    setLoading(true);

    const { error } = await supabase.auth.signOut();
    if (error) {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setAuthInitialized(true);
      setLoading(false);
      return;
    }

    setSession(null);
    setAuthInitialized(true);
    setLoading(false);
    try { window.localStorage.removeItem("cached_user_role"); } catch { /* noop */ }
    try { window.localStorage.removeItem("cached_user_id"); } catch { /* noop */ }
    if (previousUserId) {
      try { window.localStorage.removeItem(roleCacheKey(previousUserId)); } catch { /* noop */ }
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      role,
      roleVerified,
      roleLoading,
      isTestUser,
      verifyRole,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
