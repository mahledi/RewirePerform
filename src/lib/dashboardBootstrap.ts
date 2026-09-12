import {
  accessFailure,
  classifyGenericAccessFailure,
  type AccessFailure,
  type AccessFailureCode,
} from "@/lib/accessRecovery";

const DEFAULT_ATTEMPT_TIMEOUT_MS = 4_000;
const DEFAULT_OVERALL_TIMEOUT_MS = 8_500;
const DEFAULT_RETRY_DELAY_MS = 500;

export class DashboardBootstrapError extends Error {
  constructor(
    public readonly code: AccessFailureCode,
    public readonly failure: AccessFailure,
  ) {
    super(code);
    this.name = "DashboardBootstrapError";
  }
}

const classifyDashboardBootstrapFailure = (error: unknown): AccessFailure => {
  if (error instanceof DashboardBootstrapError) return error.failure;
  if (error instanceof Error && error.message === "dashboard_bootstrap_timeout") {
    return accessFailure("timeout", true);
  }
  return classifyGenericAccessFailure({
    error,
    online: window.navigator.onLine,
  });
};

const withDeadline = <T,>(
  promise: Promise<T>,
  timeoutMs: number,
  controller: AbortController,
) =>
  new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      controller.abort();
      reject(new Error("dashboard_bootstrap_timeout"));
    }, timeoutMs);
    void promise.then(
      (value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      },
      (error: unknown) => {
        window.clearTimeout(timeoutId);
        reject(error);
      },
    );
  });

const wait = (delayMs: number) => new Promise<void>((resolve) => {
  window.setTimeout(resolve, delayMs);
});

export const loadDashboardBootstrapStages = async <
  TAnalysis,
  TReferenceDate,
  TSetup,
  TStatus,
>(
  stages: {
    loadAnalysis: (signal: AbortSignal) => Promise<TAnalysis>;
    loadReferenceDate: (signal: AbortSignal) => Promise<TReferenceDate>;
    loadSetup: (referenceDate: TReferenceDate, signal: AbortSignal) => Promise<TSetup>;
    loadStatus: (referenceDate: TReferenceDate, signal: AbortSignal) => Promise<TStatus>;
  },
  signal: AbortSignal,
) => {
  const [analysis, referenceDate] = await Promise.all([
    stages.loadAnalysis(signal),
    stages.loadReferenceDate(signal),
  ]);
  const setup = await stages.loadSetup(referenceDate, signal);
  const status = await stages.loadStatus(referenceDate, signal);

  return [analysis, referenceDate, setup, status] as const;
};

export const runDashboardBootstrap = async <T,>(
  load: (signal: AbortSignal) => Promise<T>,
  options: {
    attemptTimeoutMs?: number;
    overallTimeoutMs?: number;
    retryDelayMs?: number;
  } = {},
): Promise<T> => {
  const attemptTimeoutMs = options.attemptTimeoutMs ?? DEFAULT_ATTEMPT_TIMEOUT_MS;
  const overallTimeoutMs = options.overallTimeoutMs ?? DEFAULT_OVERALL_TIMEOUT_MS;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  const deadline = Date.now() + overallTimeoutMs;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      throw new DashboardBootstrapError("timeout", accessFailure("timeout", true));
    }

    const controller = new AbortController();
    try {
      return await withDeadline(
        load(controller.signal),
        Math.min(attemptTimeoutMs, remaining),
        controller,
      );
    } catch (error) {
      controller.abort();
      const failure = classifyDashboardBootstrapFailure(error);
      if (!failure.retryable || attempt === 1) {
        throw new DashboardBootstrapError(failure.code, failure);
      }

      const delay = Math.min(retryDelayMs, Math.max(0, deadline - Date.now()));
      if (delay > 0) await wait(delay);
    }
  }

  throw new DashboardBootstrapError("unknown", accessFailure("unknown", false));
};
