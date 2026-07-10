import { supabase } from "@/integrations/supabase/client";

export type AppEventName =
  | "auth_login"
  | "auth_signup"
  | "team_join_attempt"
  | "team_join_success"
  | "onboarding_completed"
  | "assessment_saved"
  | "deep_profile_saved"
  | "daily_checkin_saved"
  | "journal_saved"
  | "pre_training_opened"
  | "push_clicked"
  | "coach_dashboard_loaded"
  | "coach_evidence_load_failed"
  | "coach_mental_state_load_failed"
  | "admin_export_downloaded";

export type AppEventStatus = "attempted" | "success" | "failed" | "opened" | "skipped";
export type AppRole = "athlete" | "coach" | "admin" | null;

type SafeMetadataValue = string | number | boolean | null;
type SafeMetadata = Record<string, SafeMetadataValue | SafeMetadataValue[]>;

type TrackAppEventInput = {
  eventName: AppEventName;
  status?: AppEventStatus;
  role?: AppRole;
  teamId?: string | null;
  route?: string;
  errorCode?: string | null;
  isTest?: boolean | null;
  metadata?: SafeMetadata;
};

type CaptureAppErrorInput = Omit<TrackAppEventInput, "status"> & {
  error: unknown;
  sentry?: boolean;
};

const PUBLIC_SENTRY_DSN_FALLBACK =
  "https://5c55886d9d44ba4aa6d1379a09868d03@o4511431236124672.ingest.de.sentry.io/4511431305920592";

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || PUBLIC_SENTRY_DSN_FALLBACK;
const APP_ENV = import.meta.env.VITE_APP_ENV || import.meta.env.MODE || "development";
const RELEASE_SHA = import.meta.env.VITE_RELEASE_SHA;

type SentryClient = typeof import("@sentry/browser");

let sentryClientPromise: Promise<SentryClient> | null = null;

const getSentryClient = () => {
  if (!SENTRY_DSN) return null;
  sentryClientPromise ??= import("@sentry/browser");
  return sentryClientPromise;
};

const sanitizeMetadata = (metadata?: SafeMetadata) => {
  if (!metadata) return {};

  return Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => {
      if (Array.isArray(value)) {
        return value.every((item) => ["string", "number", "boolean"].includes(typeof item) || item === null);
      }
      return ["string", "number", "boolean"].includes(typeof value) || value === null;
    })
  );
};

const getRoute = () => {
  if (typeof window === "undefined") return null;
  return `${window.location.pathname}${window.location.search ? "?…" : ""}`;
};

const getErrorCode = (error: unknown) => {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string") return code;
  }
  if (error instanceof Error) return error.name;
  return "unknown_error";
};

const getErrorName = (error: unknown) => {
  if (error instanceof Error) return error.name;
  if (error && typeof error === "object" && "name" in error) {
    const name = (error as { name?: unknown }).name;
    if (typeof name === "string" && name.trim()) return name;
  }
  return null;
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  if (typeof error === "string" && error.trim()) return error;
  return "Unknown application error";
};

const toError = (error: unknown) => {
  if (error instanceof Error) return error;

  const normalized = new Error(getErrorMessage(error));
  normalized.name = getErrorName(error) ?? getErrorCode(error);

  if (error && typeof error === "object") {
    const source = error as Record<string, unknown>;
    const cause = Object.fromEntries(
      Object.entries(source).filter(([, value]) =>
        ["string", "number", "boolean"].includes(typeof value) || value === null
      )
    );
    (normalized as Error & { cause?: unknown }).cause = cause;
  }

  return normalized;
};

const isSupabaseFunctionsTransportError = (error: unknown) => {
  const name = getErrorName(error);
  return name === "FunctionsFetchError" || name === "FunctionsHttpError" || name === "FunctionsRelayError";
};

const shouldSendToSentry = (input: CaptureAppErrorInput) => {
  if (input.sentry === false) return false;
  if (
    (input.eventName === "coach_dashboard_loaded" || input.eventName === "coach_mental_state_load_failed") &&
    isSupabaseFunctionsTransportError(input.error)
  ) {
    return false;
  }
  return true;
};

export const initMonitoring = () => {
  void getSentryClient()
    ?.then((Sentry) => {
      Sentry.init({
        dsn: SENTRY_DSN,
        environment: APP_ENV,
        release: RELEASE_SHA || undefined,
        sendDefaultPii: false,
        tracesSampleRate: 0,
        beforeSend(event) {
          if (event.user) {
            event.user = { id: event.user.id };
          }
          delete event.request?.cookies;
          delete event.request?.headers;
          return event;
        },
      });
    })
    .catch((error) => {
      console.warn("[ops] sentry init failed", error);
    });
};

export const setMonitoringUser = (input: {
  userId: string | null;
  role?: AppRole;
  isTest?: boolean | null;
}) => {
  const sentryClient = getSentryClient();
  if (!sentryClient) return;

  void sentryClient
    .then((Sentry) => {
      if (!input.userId) {
        Sentry.setUser(null);
        Sentry.setContext("app_user", null);
        return;
      }

      Sentry.setUser({ id: input.userId });
      Sentry.setContext("app_user", {
        role: input.role ?? null,
        is_test_user: input.isTest ?? null,
      });
    })
    .catch((error) => {
      console.warn("[ops] sentry user context failed", error);
    });
};

export const trackAppEvent = async ({
  eventName,
  status = "failed",
  role,
  teamId,
  route,
  errorCode,
  isTest,
  metadata,
}: TrackAppEventInput) => {
  try {
    await supabase.from("app_event_log").insert({
      event_name: eventName,
      status,
      role: role ?? null,
      team_id: teamId ?? null,
      route: route ?? getRoute(),
      error_code: errorCode ?? null,
      is_test: Boolean(isTest),
      metadata: sanitizeMetadata(metadata),
    });
  } catch (error) {
    // Event logging must never break a user flow.
    console.warn("[ops] app_event_log insert failed", error);
  }
};

export const captureAppError = async ({
  error,
  eventName,
  role,
  teamId,
  route,
  errorCode,
  isTest,
  metadata,
  sentry,
}: CaptureAppErrorInput) => {
  const sentryClient = getSentryClient();
  if (sentryClient && shouldSendToSentry({ error, eventName, role, teamId, route, errorCode, isTest, metadata, sentry })) {
    try {
      const Sentry = await sentryClient;
      Sentry.captureException(toError(error), {
        tags: {
          app_event: eventName,
          role: role ?? "unknown",
          is_test: String(Boolean(isTest)),
        },
        extra: sanitizeMetadata(metadata),
      });
    } catch (sentryError) {
      console.warn("[ops] sentry capture failed", sentryError);
    }
  }

  await trackAppEvent({
    eventName,
    status: "failed",
    role,
    teamId,
    route,
    errorCode: errorCode ?? getErrorCode(error),
    isTest,
    metadata,
  });
};
