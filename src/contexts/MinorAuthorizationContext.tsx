import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAuth, type VerifiedAppRole } from "@/contexts/AuthContext";
import { MinorAuthorizationContext } from "@/contexts/minorAuthorizationContextValue";
import { supabase } from "@/integrations/supabase/client";
import {
  accessFailure,
  classifyGenericAccessFailure,
  traceAccessRecovery,
  waitForAccessDelay,
  type AccessFailure,
  type AccessRecoveryPhase,
  type AccessStepResult,
} from "@/lib/accessRecovery";
import {
  getMinorAuthorizationStatus,
  MinorAuthorizationError,
  type MinorAuthorizationStatus,
} from "@/lib/minorAuthorization";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";

const ACCESS_RECOVERY_DEADLINE_MS = 9_000;
const LIFECYCLE_RECOVERY_DEADLINE_MS = 13_000;
const ACCESS_RETRY_DELAY_MS = 500;
const LIFECYCLE_SETTLE_DELAY_MS = 500;

type RecoveryTrigger = "initial" | "lifecycle" | "manual";

const failureFromMinorError = (error: unknown): AccessFailure =>
  error instanceof MinorAuthorizationError
    ? error.failure
    : accessFailure("unknown", false);

export const MinorAuthorizationProvider = ({ children }: { children: ReactNode }) => {
  const {
    user,
    role,
    roleVerified,
    loading: authLoading,
    verifyRole,
  } = useAuth();
  const [status, setStatusState] = useState<MinorAuthorizationStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<AccessRecoveryPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const authRef = useRef({
    userId: user?.id ?? null,
    role,
    roleVerified,
    authLoading,
  });
  const statusRef = useRef<MinorAuthorizationStatus | null>(status);
  const accessUserIdRef = useRef<string | null>(null);
  const cycleRef = useRef(0);
  const recoveryInFlightRef = useRef<{
    userId: string;
    cycle: number;
    controller: AbortController;
    promise: Promise<MinorAuthorizationStatus | null>;
  } | null>(null);

  authRef.current = {
    userId: user?.id ?? null,
    role,
    roleVerified,
    authLoading,
  };
  statusRef.current = status;

  const commitStatus = useCallback((next: MinorAuthorizationStatus) => {
    statusRef.current = next;
    setStatusState(next);
    setError(null);
    setPhase("ready");
  }, []);

  const refreshSessionOnce = useCallback(async (): Promise<AccessStepResult<true>> => {
    const { data, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !data.session) {
      return { ok: false, failure: accessFailure("unauthorized", false, 401) };
    }
    return { ok: true, value: true };
  }, []);

  const recoverAccess = useCallback((
    trigger: RecoveryTrigger,
  ): Promise<MinorAuthorizationStatus | null> => {
    const userId = authRef.current.userId;
    if (!userId) return Promise.resolve(null);

    const existing = recoveryInFlightRef.current;
    if (existing?.userId === userId) return existing.promise;
    existing?.controller.abort();

    const cycle = ++cycleRef.current;
    const controller = new AbortController();
    let deadlineReached = false;

    const ownsCycle = () =>
      authRef.current.userId === userId && cycleRef.current === cycle;
    const isCurrent = () => !controller.signal.aborted && ownsCycle();

    const normalizeFailure = (failure: AccessFailure) =>
      deadlineReached ? accessFailure("timeout", true) : failure;

    const runWithinCycle = async <T,>(
      execute: () => Promise<AccessStepResult<T>>,
    ): Promise<AccessStepResult<T>> => {
      let removeAbortListener = () => undefined;
      const aborted = new Promise<AccessStepResult<T>>((resolve) => {
        const handleAbort = () => {
          resolve({
            ok: false,
            failure: normalizeFailure(accessFailure("aborted", false)),
          });
        };
        if (controller.signal.aborted) {
          handleAbort();
          return;
        }
        controller.signal.addEventListener("abort", handleAbort, { once: true });
        removeAbortListener = () => controller.signal.removeEventListener("abort", handleAbort);
      });

      try {
        return await Promise.race([execute(), aborted]);
      } catch (caught) {
        return {
          ok: false,
          failure: classifyGenericAccessFailure({
            error: caught,
            online: window.navigator.onLine,
          }),
        };
      } finally {
        removeAbortListener();
      }
    };

    const runStep = async <T,>(
      stepPhase: AccessRecoveryPhase,
      execute: () => Promise<AccessStepResult<T>>,
    ): Promise<AccessStepResult<T>> => {
      let retryUsed = false;
      let sessionRefreshUsed = false;

      for (;;) {
        if (controller.signal.aborted) {
          return { ok: false, failure: normalizeFailure(accessFailure("aborted", false)) };
        }
        if (isCurrent()) setPhase(stepPhase);
        traceAccessRecovery({ cycle, phase: stepPhase, event: retryUsed ? "retry" : "attempt" });

        const result = await runWithinCycle(execute);
        if (!("failure" in result)) {
          traceAccessRecovery({ cycle, phase: stepPhase, event: "success" });
          return result;
        }

        const failure = normalizeFailure(result.failure);
        traceAccessRecovery({
          cycle,
          phase: stepPhase,
          event: "failure",
          failure: failure.code,
        });
        if (controller.signal.aborted) return { ok: false, failure };

        if (failure.code === "unauthorized" && !sessionRefreshUsed && !retryUsed) {
          sessionRefreshUsed = true;
          retryUsed = true;
          const refreshed = await runWithinCycle(refreshSessionOnce);
          if ("failure" in refreshed) {
            return { ok: false, failure: normalizeFailure(refreshed.failure) };
          }
          continue;
        }

        if (!failure.retryable || retryUsed) return { ok: false, failure };
        retryUsed = true;
        if (!await waitForAccessDelay(ACCESS_RETRY_DELAY_MS, controller.signal)) {
          return { ok: false, failure: normalizeFailure(accessFailure("aborted", false)) };
        }
      }
    };

    const recoveryDeadlineMs = trigger === "lifecycle"
      ? LIFECYCLE_RECOVERY_DEADLINE_MS
      : ACCESS_RECOVERY_DEADLINE_MS;
    const deadlineId = window.setTimeout(() => {
      deadlineReached = true;
      controller.abort();
    }, recoveryDeadlineMs);

    const recovery = (async () => {
      setLoading(true);
      setError(null);
      setPhase("checking_role");
      if (trigger === "initial") {
        statusRef.current = null;
        setStatusState(null);
      }
      traceAccessRecovery({ cycle, phase: "checking_role", event: `start_${trigger}` });

      if (trigger === "initial" && !window.navigator.onLine && !authRef.current.roleVerified) {
        const failure = accessFailure("offline", true);
        setError(failure.code);
        setPhase("failed");
        traceAccessRecovery({ cycle, phase: "failed", event: "offline", failure: failure.code });
        return null;
      }

      if (trigger === "lifecycle") {
        if (!await waitForAccessDelay(LIFECYCLE_SETTLE_DELAY_MS, controller.signal)) return null;
      }

      let verifiedRole: VerifiedAppRole | null = null;
      if (trigger === "initial" && authRef.current.roleVerified && authRef.current.role) {
        verifiedRole = authRef.current.role;
      } else {
        const roleResult = await runStep(
          "checking_role",
          () => verifyRole(controller.signal),
        );
        if ("failure" in roleResult) {
          if (ownsCycle()) {
            setError(roleResult.failure.code);
            setPhase("failed");
          }
          return null;
        }
        verifiedRole = roleResult.value;
      }

      if (verifiedRole !== "athlete") {
        if (ownsCycle()) {
          setError(null);
          setPhase("ready");
        }
        return null;
      }

      const authorizationResult = await runStep("checking_authorization", async () => {
        try {
          const next = await getMinorAuthorizationStatus({ signal: controller.signal });
          return { ok: true, value: next } as const;
        } catch (caught) {
          return { ok: false, failure: failureFromMinorError(caught) } as const;
        }
      });

      if ("failure" in authorizationResult) {
        if (ownsCycle()) {
          setError(authorizationResult.failure.code);
          setPhase("failed");
        }
        return null;
      }

      if (!isCurrent()) return null;
      commitStatus(authorizationResult.value);
      return authorizationResult.value;
    })().finally(() => {
      window.clearTimeout(deadlineId);
      if (recoveryInFlightRef.current?.cycle === cycle) {
        recoveryInFlightRef.current = null;
        setLoading(false);
      }
    });

    recoveryInFlightRef.current = { userId, cycle, controller, promise: recovery };
    return recovery;
  }, [commitStatus, refreshSessionOnce, verifyRole]);

  const refresh = useCallback(() => recoverAccess("manual"), [recoverAccess]);

  useEffect(() => {
    if (authLoading) return;

    const userId = user?.id ?? null;
    if (accessUserIdRef.current !== userId) {
      accessUserIdRef.current = userId;
      cycleRef.current += 1;
      recoveryInFlightRef.current?.controller.abort();
      recoveryInFlightRef.current = null;
      statusRef.current = null;
      setStatusState(null);
      setError(null);
      setLoading(false);
      setPhase("idle");

      if (!userId) return;
      if (roleVerified && (role === "coach" || role === "admin")) {
        setPhase("ready");
        return;
      }
      void recoverAccess("initial");
      return;
    }

    if (!userId) {
      recoveryInFlightRef.current?.controller.abort();
      recoveryInFlightRef.current = null;
      statusRef.current = null;
      setStatusState(null);
      setError(null);
      setLoading(false);
      setPhase("idle");
      return;
    }

    if (roleVerified && (role === "coach" || role === "admin")) {
      recoveryInFlightRef.current?.controller.abort();
      recoveryInFlightRef.current = null;
      statusRef.current = null;
      setStatusState(null);
      setError(null);
      setLoading(false);
      setPhase("ready");
      return;
    }

    if (!statusRef.current && !recoveryInFlightRef.current) {
      void recoverAccess("initial");
    }
  }, [authLoading, recoverAccess, role, roleVerified, user?.id]);

  useEffect(() => {
    const recoverIfNeeded = () => {
      const current = authRef.current;
      const currentStatus = statusRef.current;
      if (
        !current.userId
        || recoveryInFlightRef.current
        || (currentStatus && currentStatus.state !== "guardian_pending")
      ) return;
      void recoverAccess("lifecycle");
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") recoverIfNeeded();
    };

    window.addEventListener("online", recoverIfNeeded);
    window.addEventListener("focus", recoverIfNeeded);
    window.addEventListener("pageshow", recoverIfNeeded);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("online", recoverIfNeeded);
      window.removeEventListener("focus", recoverIfNeeded);
      window.removeEventListener("pageshow", recoverIfNeeded);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [recoverAccess]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let disposed = false;
    let listener: PluginListenerHandle | null = null;
    void CapacitorApp.addListener("appStateChange", ({ isActive }) => {
      if (!isActive) return;
      const currentStatus = statusRef.current;
      if (
        authRef.current.userId
        && !recoveryInFlightRef.current
        && (!currentStatus || currentStatus.state === "guardian_pending")
      ) {
        void recoverAccess("lifecycle");
      }
    }).then((handle) => {
      if (disposed) void handle.remove();
      else listener = handle;
    });

    return () => {
      disposed = true;
      if (listener) void listener.remove();
    };
  }, [recoverAccess]);

  useEffect(() => () => {
    recoveryInFlightRef.current?.controller.abort();
    recoveryInFlightRef.current = null;
  }, []);

  const value = useMemo(
    () => ({ status, loading, phase, error, refresh, setStatus: commitStatus }),
    [commitStatus, error, loading, phase, refresh, status],
  );
  return <MinorAuthorizationContext.Provider value={value}>{children}</MinorAuthorizationContext.Provider>;
};
