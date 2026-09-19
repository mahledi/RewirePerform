import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from "@supabase/supabase-js";
import { Capacitor, CapacitorHttp } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import {
  accessFailure,
  classifyGenericAccessFailure,
  type AccessFailure,
} from "@/lib/accessRecovery";

export type MinorAgeBand = "under_16" | "age_16_17" | "adult";
export type MinorAuthorizationState =
  | "unknown_age"
  | "guardian_contact_required"
  | "guardian_pending"
  | "guardian_declined"
  | "guardian_expired"
  | "athlete_assent_required"
  | "product_authorized"
  | "declined"
  | "revoked"
  | "policy_refresh_required"
  | "pending";

export interface MinorAuthorizationStatus {
  state: MinorAuthorizationState;
  age_band: MinorAgeBand | null;
  product_status: "pending" | "authorized" | "declined" | "revoked" | "policy_refresh_required";
  guardian_status: "not_required" | "required" | "pending" | "authorized" | "declined" | "expired" | "revoked";
  athlete_status: "not_required" | "required" | "authorized" | "declined" | "revoked";
  data_contribution_status: "not_asked" | "authorized" | "declined" | "revoked" | "policy_refresh_required";
  data_contribution_guardian?: boolean | null;
  data_contribution_athlete?: boolean | null;
  guardian_email_mask: string | null;
  challenge_expires_at?: string | null;
  policy_key: string;
  product_version: string;
  guardian_notice_version: string;
  guardian_decision_version: string;
  athlete_assent_version: string;
  data_contribution_version: string;
  enforcement_enabled: boolean;
}

export class MinorAuthorizationError extends Error {
  constructor(
    public readonly code: string,
    public readonly failure: AccessFailure = accessFailure("unknown", false),
  ) {
    super(code);
    this.name = "MinorAuthorizationError";
  }
}

interface MinorAuthorizationInvokeOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

const NATIVE_STATUS_RESPONSE_MAX_LENGTH = 32_768;

const readHttpErrorPayload = async (context: unknown) => {
  const candidate = context as {
    clone?: () => { json?: () => Promise<unknown> };
    json?: () => Promise<unknown>;
  } | null;
  const readable = candidate?.clone?.() ?? candidate;
  return readable?.json?.().catch(() => null) as Promise<{ error?: unknown } | null> | undefined;
};

const httpAuthorizationError = (
  status: number | undefined,
  serverCode: string | null,
) => {
  if (status === 401) {
    return new MinorAuthorizationError(
      serverCode ?? "unauthorized",
      accessFailure("unauthorized", false, status),
    );
  }
  if (status === 403) {
    return new MinorAuthorizationError(
      serverCode ?? "forbidden",
      accessFailure("forbidden", false, status),
    );
  }
  if (status === 429) {
    return new MinorAuthorizationError(
      serverCode ?? "rate_limit_reached",
      accessFailure("rate_limited", true, status),
    );
  }
  if (status === 503) {
    return new MinorAuthorizationError(
      serverCode ?? "service_unavailable",
      accessFailure("service_unavailable", true, status),
    );
  }
  return new MinorAuthorizationError(
    serverCode ?? "http_error",
    accessFailure("http_error", false, status),
  );
};

const classifyFunctionError = async (
  error: unknown,
  options: { timedOut: boolean; externallyAborted: boolean },
) => {
  if (options.externallyAborted) {
    return new MinorAuthorizationError("aborted", accessFailure("aborted", false));
  }
  if (options.timedOut) {
    return new MinorAuthorizationError("timeout", accessFailure("timeout", true));
  }
  if (error instanceof FunctionsFetchError) {
    return new MinorAuthorizationError("fetch_error", accessFailure("fetch_error", true));
  }
  if (error instanceof FunctionsRelayError) {
    return new MinorAuthorizationError("relay_error", accessFailure("relay_error", false));
  }
  if (error instanceof FunctionsHttpError) {
    const context = error.context as { status?: unknown } | null;
    const status = typeof context?.status === "number" ? context.status : undefined;
    const payload = await readHttpErrorPayload(error.context);
    const serverCode = typeof payload?.error === "string" ? payload.error : null;
    return httpAuthorizationError(status, serverCode);
  }

  const failure = classifyGenericAccessFailure({ error, online: window.navigator.onLine });
  return new MinorAuthorizationError(failure.code, failure);
};

const nativeMinorFunctionConfig = () => {
  const rawUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!rawUrl || !publishableKey) {
    throw new MinorAuthorizationError(
      "invalid_response",
      accessFailure("invalid_response", false),
    );
  }

  try {
    const url = new URL(rawUrl);
    if (
      url.protocol !== "https:"
      || url.username
      || url.password
      || url.search
      || url.hash
      || (url.pathname !== "/" && url.pathname !== "")
    ) {
      throw new Error("invalid");
    }
    return {
      publishableKey,
      url: `${url.origin}/functions/v1/minor-guardian-user`,
    };
  } catch {
    throw new MinorAuthorizationError(
      "invalid_response",
      accessFailure("invalid_response", false),
    );
  }
};

const nativeResponsePayload = (value: unknown): Record<string, unknown> | null => {
  let payload = value;
  if (typeof payload === "string") {
    if (payload.length > NATIVE_STATUS_RESPONSE_MAX_LENGTH) return null;
    try {
      payload = JSON.parse(payload) as unknown;
    } catch {
      return null;
    }
  }
  return payload && typeof payload === "object" && !Array.isArray(payload)
    ? payload as Record<string, unknown>
    : null;
};

const invokeNativeStatus = async (): Promise<MinorAuthorizationStatus> => {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.access_token) {
      throw new MinorAuthorizationError(
        "unauthorized",
        accessFailure("unauthorized", false, 401),
      );
    }

    const config = nativeMinorFunctionConfig();
    const response = await CapacitorHttp.post({
      url: config.url,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: config.publishableKey,
        "Content-Type": "application/json",
      },
      data: { action: "status" },
      connectTimeout: 2_500,
      readTimeout: 2_500,
      disableRedirects: true,
      responseType: "json",
    });
    const payload = nativeResponsePayload(response.data);
    if (response.status < 200 || response.status >= 300) {
      const serverCode = typeof payload?.error === "string" ? payload.error : null;
      throw httpAuthorizationError(response.status, serverCode);
    }
    if (!payload || typeof payload.state !== "string") {
      throw new MinorAuthorizationError(
        "invalid_response",
        accessFailure("invalid_response", false),
      );
    }
    return payload as unknown as MinorAuthorizationStatus;
  } catch (error) {
    if (error instanceof MinorAuthorizationError) throw error;
    const failure = classifyGenericAccessFailure({
      error,
      online: window.navigator.onLine,
    });
    throw new MinorAuthorizationError(failure.code, failure);
  }
};

const createRequestController = (options: MinorAuthorizationInvokeOptions) => {
  const controller = new AbortController();
  let timedOut = false;
  let externallyAborted = options.signal?.aborted ?? false;
  let removeControllerAbortListener = () => undefined;

  const interrupted = new Promise<never>((_resolve, reject) => {
    const handleControllerAbort = () => {
      reject(timedOut
        ? new MinorAuthorizationError("timeout", accessFailure("timeout", true))
        : new MinorAuthorizationError("aborted", accessFailure("aborted", false)));
    };
    if (controller.signal.aborted) {
      handleControllerAbort();
      return;
    }
    controller.signal.addEventListener("abort", handleControllerAbort, { once: true });
    removeControllerAbortListener = () =>
      controller.signal.removeEventListener("abort", handleControllerAbort);
  });

  const handleExternalAbort = () => {
    externallyAborted = true;
    controller.abort();
  };
  options.signal?.addEventListener("abort", handleExternalAbort, { once: true });
  if (externallyAborted) controller.abort();

  const timeoutId = options.timeoutMs
    ? window.setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, options.timeoutMs)
    : null;

  return {
    controller,
    interrupted,
    state: () => ({ timedOut, externallyAborted }),
    cleanup: () => {
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      removeControllerAbortListener();
      options.signal?.removeEventListener("abort", handleExternalAbort);
    },
  };
};

const invoke = async (
  body: Record<string, unknown>,
  options: MinorAuthorizationInvokeOptions = {},
): Promise<MinorAuthorizationStatus> => {
  const request = createRequestController(options);
  try {
    const transport = body.action === "status" && Capacitor.isNativePlatform()
      ? invokeNativeStatus().then((data) => ({ data, error: null }))
      : supabase.functions.invoke("minor-guardian-user", {
          body,
          signal: request.controller.signal,
        });
    const { data, error } = await Promise.race([
      transport,
      request.interrupted,
    ]);
    if (error) throw await classifyFunctionError(error, request.state());
    if (!data || typeof data !== "object" || typeof data.state !== "string") {
      throw new MinorAuthorizationError(
        "invalid_response",
        accessFailure("invalid_response", false),
      );
    }
    return data as MinorAuthorizationStatus;
  } finally {
    request.cleanup();
  }
};

export const getMinorAuthorizationStatus = (options: MinorAuthorizationInvokeOptions = {}) =>
  invoke({ action: "status" }, { timeoutMs: 2_500, ...options });
export const setMinorAgeBand = (ageBand: MinorAgeBand) => invoke({ action: "set-age", ageBand });
export const startGuardianAuthorization = (guardianEmail: string) =>
  invoke({ action: "start", guardianEmail });
export const resendGuardianAuthorization = () => invoke({ action: "resend" });
export const saveAthleteAssent = (productAuthorized: boolean, dataContributionAuthorized: boolean) =>
  invoke({ action: "assent", productAuthorized, dataContributionAuthorized });
export const saveAuthorizedDataContribution = (authorized: boolean) =>
  invoke({ action: "set-data-contribution", authorized });
export const revokeMinorAuthorization = () => invoke({ action: "revoke" });
export const restartMinorAuthorization = () => invoke({ action: "restart" });

export interface GuardianLinkStatus {
  state: "pending" | "approved" | "declined" | "expired" | "revoked" | "delivery_failed" | "invalid" | "active";
  expires_at?: string;
  guardian_email_mask?: string;
  product_status?: string;
  data_contribution_status?: string;
  data_contribution_guardian?: boolean | null;
  feedback_text_authorization_available?: boolean;
  feedback_text_authorization_state?: "unavailable" | "not_asked" | "granted" | "declined" | "withdrawn";
  feedback_text_retention_days?: number | null;
  feedback_text_processor_mode?: "no_external_processor" | "approved_processor" | null;
  athlete_first_name?: string | null;
  policy_key?: string;
}

const invokePublic = async <T extends object>(body: Record<string, unknown>): Promise<T> => {
  const rawUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!rawUrl || !publishableKey) throw new MinorAuthorizationError("link_unavailable");

  let functionUrl: string;
  try {
    const url = new URL(rawUrl);
    if (
      url.protocol !== "https:"
      || url.username
      || url.password
      || url.search
      || url.hash
      || (url.pathname !== "/" && url.pathname !== "")
    ) throw new Error("invalid");
    functionUrl = `${url.origin}/functions/v1/minor-guardian-public`;
  } catch {
    throw new MinorAuthorizationError("link_unavailable");
  }

  let response: Response;
  try {
    response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        apikey: publishableKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      credentials: "omit",
      cache: "no-store",
      referrerPolicy: "no-referrer",
    });
  } catch {
    throw new MinorAuthorizationError("link_unavailable");
  }

  if (!response.ok) throw new MinorAuthorizationError("link_unavailable");
  const data = await response.json().catch(() => null) as unknown;
  if (!data || typeof data !== "object") throw new MinorAuthorizationError("invalid_response");
  return data as T;
};

export const inspectGuardianDecision = async (token: string) => {
  const result = await invokePublic<GuardianLinkStatus>({ action: "inspect", token });
  if (typeof result.state !== "string") throw new MinorAuthorizationError("invalid_response");
  return result;
};

export const submitGuardianDecision = async (
  token: string,
  productAuthorized: boolean,
  dataContributionAuthorized: boolean,
  guardianFeedbackTextAuthorized: boolean,
) => invokePublic<{
  state: "approved" | "declined";
  feedbackTextAuthorizationState: "unavailable" | "granted" | "declined";
  receiptDelivery: "not_required" | "sent" | "failed";
  manageUrl: string | null;
}>({
  action: "decide",
  token,
  productAuthorized,
  dataContributionAuthorized,
  guardianFeedbackTextAuthorized,
  guardianDeclaration: true,
});

export const inspectGuardianManagement = async (token: string) => {
  const result = await invokePublic<GuardianLinkStatus>({ action: "inspect-management", token });
  if (typeof result.state !== "string") throw new MinorAuthorizationError("invalid_response");
  return result;
};

export const revokeGuardianAuthorization = async (token: string) =>
  invokePublic<{ state: "revoked" }>({ action: "revoke", token });

export const withdrawGuardianDataContribution = async (token: string) =>
  invokePublic<GuardianLinkStatus>({ action: "withdraw-data-contribution", token });

export const setGuardianFeedbackTextAuthorization = async (token: string, authorized: boolean) =>
  invokePublic<GuardianLinkStatus>({
    action: "set-feedback-text-authorization",
    token,
    authorized,
  });
