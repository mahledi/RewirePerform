export type AccessRecoveryPhase =
  | "idle"
  | "checking_role"
  | "checking_authorization"
  | "ready"
  | "failed";

export type AccessFailureCode =
  | "offline"
  | "timeout"
  | "aborted"
  | "fetch_error"
  | "relay_error"
  | "unauthorized"
  | "forbidden"
  | "rate_limited"
  | "service_unavailable"
  | "invalid_response"
  | "role_missing"
  | "http_error"
  | "unknown";

export interface AccessFailure {
  code: AccessFailureCode;
  retryable: boolean;
  status?: number;
}

export type AccessStepResult<T> =
  | { ok: true; value: T }
  | { ok: false; failure: AccessFailure };

export const accessFailure = (
  code: AccessFailureCode,
  retryable: boolean,
  status?: number,
): AccessFailure => ({ code, retryable, ...(status ? { status } : {}) });

export const classifyGenericAccessFailure = ({
  error,
  timedOut = false,
  externallyAborted = false,
  online = true,
}: {
  error: unknown;
  timedOut?: boolean;
  externallyAborted?: boolean;
  online?: boolean;
}): AccessFailure => {
  if (externallyAborted) return accessFailure("aborted", false);
  if (timedOut) return accessFailure("timeout", true);
  if (!online) return accessFailure("offline", true);

  const candidate = error as {
    code?: unknown;
    message?: unknown;
    name?: unknown;
    status?: unknown;
  } | null;
  const status = typeof candidate?.status === "number" ? candidate.status : undefined;
  if (status === 401) return accessFailure("unauthorized", false, status);
  if (status === 403) return accessFailure("forbidden", false, status);
  if (status === 429) return accessFailure("rate_limited", true, status);
  if (status === 503) return accessFailure("service_unavailable", true, status);

  const name = typeof candidate?.name === "string" ? candidate.name : "";
  const message = typeof candidate?.message === "string" ? candidate.message : "";
  const code = typeof candidate?.code === "string" ? candidate.code : "";
  if (name === "AbortError") return accessFailure("aborted", false);
  if (/failed to fetch|load failed|network|internet connection|network request failed/i.test(message)) {
    return accessFailure("fetch_error", true);
  }
  if (code === "PGRST003") return accessFailure("service_unavailable", true, 503);
  return accessFailure("unknown", false, status);
};

export const waitForAccessDelay = (delayMs: number, signal: AbortSignal) =>
  new Promise<boolean>((resolve) => {
    if (signal.aborted) {
      resolve(false);
      return;
    }

    const handleAbort = () => {
      window.clearTimeout(timerId);
      resolve(false);
    };
    const timerId = window.setTimeout(() => {
      signal.removeEventListener("abort", handleAbort);
      resolve(true);
    }, delayMs);
    signal.addEventListener("abort", handleAbort, { once: true });
  });

export type AccessTraceEvent = {
  cycle: number;
  event: string;
  phase: AccessRecoveryPhase;
  failure?: AccessFailureCode;
};

export type AccessTraceEntry = AccessTraceEvent & { at: string };

const diagnosticsEnabled =
  import.meta.env.DEV || import.meta.env.VITE_ACCESS_DIAGNOSTICS === "true";
export const accessRecoveryDiagnosticsEnabled = diagnosticsEnabled;
const traceEntries: AccessTraceEntry[] = [];

export const traceAccessRecovery = (entry: AccessTraceEvent) => {
  if (!diagnosticsEnabled) return;
  const safeEntry = { ...entry, at: new Date().toISOString() };
  traceEntries.push(safeEntry);
  if (traceEntries.length > 30) traceEntries.shift();
  console.info("[access-recovery]", safeEntry);
};

export const getAccessRecoveryTrace = () => [...traceEntries];

export const getLatestAccessRecoveryTrace = (): AccessTraceEntry | null => {
  if (!diagnosticsEnabled || traceEntries.length === 0) return null;
  return traceEntries[traceEntries.length - 1];
};
