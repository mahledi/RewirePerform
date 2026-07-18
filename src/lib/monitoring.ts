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
  | "coach_evidence_save_failed"
  | "coach_mental_state_load_failed"
  | "evidence_status_load_failed"
  | "admin_export_downloaded";

export type AppEventStatus = "attempted" | "success" | "failed" | "opened" | "skipped";
export type AppRole = "athlete" | "coach" | "admin" | null;

type SafeMetadataValue = string | number | boolean | null;
type SafeMetadata = Record<string, SafeMetadataValue | SafeMetadataValue[]>;

const SAFE_METADATA_KEYS = new Set([
  "action",
  "answer_count",
  "assessment_type",
  "day_number",
  "event_type",
  "has_notification_id",
  "has_program_instance",
  "instrument_id",
  "item_count",
  "questionnaire_version",
  "scope",
  "source",
  "stage",
  "timing",
]);
const SAFE_DIAGNOSTIC_TOKEN = /^[A-Za-z0-9_.:/-]{1,96}$/;
const DISABLED_SENTRY_INTEGRATIONS = new Set([
  "Breadcrumbs",
  "BrowserApiErrors",
  "GlobalHandlers",
  "TryCatch",
]);

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
const ALLOW_LOCAL_SENTRY = import.meta.env.VITE_SENTRY_ALLOW_LOCAL === "true";

type MonitoringLocation = Pick<Location, "hostname" | "protocol">;

const normalizeHostname = (hostname: string) =>
  hostname.toLowerCase().replace(/\.$/, "").replace(/^\[(.*)\]$/, "$1");

export const isLocalBrowserMonitoringOrigin = (location?: MonitoringLocation | null) => {
  if (!location || !["http:", "https:"].includes(location.protocol.toLowerCase())) return false;

  const hostname = normalizeHostname(location.hostname);
  return (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    /^127(?:\.\d{1,3}){3}$/.test(hostname)
  );
};

export const resolveSentryRuntimePolicy = ({
  dsn,
  appEnvironment,
  allowLocal,
  location,
}: {
  dsn: string;
  appEnvironment: string;
  allowLocal: boolean;
  location?: MonitoringLocation | null;
}) => {
  const isLocalBrowser = isLocalBrowserMonitoringOrigin(location);
  return {
    enabled: Boolean(dsn) && (!isLocalBrowser || allowLocal),
    environment: isLocalBrowser ? "local-preview" : appEnvironment,
  };
};

const sentryRuntimePolicy = resolveSentryRuntimePolicy({
  dsn: SENTRY_DSN,
  appEnvironment: APP_ENV,
  allowLocal: ALLOW_LOCAL_SENTRY,
  location: typeof window === "undefined" ? null : window.location,
});

type SentryClient = typeof import("@sentry/browser");

let sentryClientPromise: Promise<SentryClient> | null = null;

const getSentryClient = () => {
  if (!sentryRuntimePolicy.enabled) return null;
  sentryClientPromise ??= import("@sentry/browser");
  return sentryClientPromise;
};

const sanitizeMetadataValue = (value: SafeMetadataValue): SafeMetadataValue | undefined => {
  if (typeof value === "string") {
    return SAFE_DIAGNOSTIC_TOKEN.test(value) ? value : undefined;
  }
  return ["number", "boolean"].includes(typeof value) || value === null ? value : undefined;
};

export const sanitizeMonitoringMetadata = (metadata?: SafeMetadata) => {
  if (!metadata) return {};

  const result: SafeMetadata = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (!SAFE_METADATA_KEYS.has(key)) continue;
    if (Array.isArray(value)) {
      const sanitized = value
        .map((item) => sanitizeMetadataValue(item))
        .filter((item): item is SafeMetadataValue => item !== undefined);
      if (sanitized.length === value.length) result[key] = sanitized;
      continue;
    }
    const sanitized = sanitizeMetadataValue(value);
    if (sanitized !== undefined) result[key] = sanitized;
  }
  return result;
};

const sanitizeDiagnosticToken = (value: unknown, fallback: string) =>
  typeof value === "string" && SAFE_DIAGNOSTIC_TOKEN.test(value) ? value : fallback;

const sanitizeRoute = (route: string | null | undefined) => {
  if (!route) return null;
  const pathname = route.split(/[?#]/, 1)[0];
  return pathname.startsWith("/") ? pathname.slice(0, 160) : null;
};

const sanitizeRequestUrl = (value: string | undefined) => {
  if (!value) return undefined;
  try {
    const parsed = new URL(value, window.location.origin);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return undefined;
  }
};

const getRoute = () => {
  if (typeof window === "undefined") return null;
  return `${window.location.pathname}${window.location.search ? "?…" : ""}`;
};

const getErrorCode = (error: unknown) => {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string") return sanitizeDiagnosticToken(code, "unknown_error");
  }
  if (error instanceof Error) return sanitizeDiagnosticToken(error.name, "application_error");
  return "unknown_error";
};

const getErrorName = (error: unknown) => {
  if (error instanceof Error) return sanitizeDiagnosticToken(error.name, "ApplicationError");
  if (error && typeof error === "object" && "name" in error) {
    const name = (error as { name?: unknown }).name;
    if (typeof name === "string" && name.trim()) {
      return sanitizeDiagnosticToken(name, "ApplicationError");
    }
  }
  return null;
};

export const toMonitoringError = (error: unknown) => {
  const code = getErrorCode(error);
  const normalized = new Error(`Application operation failed (${code})`);
  normalized.name = getErrorName(error) ?? "ApplicationError";

  if (error instanceof Error && error.stack) {
    const stackFrames = error.stack
      .split("\n")
      .slice(1)
      .filter((line) => line.trimStart().startsWith("at "))
      .slice(0, 20);
    if (stackFrames.length > 0) {
      normalized.stack = `${normalized.name}: ${normalized.message}\n${stackFrames.join("\n")}`;
    }
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
        environment: sentryRuntimePolicy.environment,
        release: RELEASE_SHA || undefined,
        sendDefaultPii: false,
        tracesSampleRate: 0,
        maxBreadcrumbs: 0,
        integrations(defaultIntegrations) {
          return defaultIntegrations.filter(
            (integration) => !DISABLED_SENTRY_INTEGRATIONS.has(integration.name),
          );
        },
        beforeSend(event) {
          if (event.user) {
            event.user = { id: event.user.id };
          }
          event.breadcrumbs = [];
          event.extra = sanitizeMonitoringMetadata(event.extra as SafeMetadata | undefined);
          if (event.message) event.message = "Application diagnostic event";
          if (event.logentry) {
            event.logentry.message = "Application diagnostic event";
            event.logentry.params = [];
          }
          for (const exception of event.exception?.values ?? []) {
            exception.type = sanitizeDiagnosticToken(exception.type, "ApplicationError");
            if (!exception.value?.startsWith("Application operation failed (")) {
              exception.value = "Application operation failed (unknown_error)";
            }
            for (const frame of exception.stacktrace?.frames ?? []) {
              delete frame.vars;
            }
          }
          delete event.request?.cookies;
          delete event.request?.headers;
          delete event.request?.data;
          delete event.request?.env;
          delete event.request?.query_string;
          if (event.request) {
            event.request.url = sanitizeRequestUrl(event.request.url);
          }
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
      route: sanitizeRoute(route ?? getRoute()),
      error_code: errorCode ? sanitizeDiagnosticToken(errorCode, "unknown_error") : null,
      is_test: Boolean(isTest),
      metadata: sanitizeMonitoringMetadata(metadata),
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
      Sentry.captureException(toMonitoringError(error), {
        tags: {
          app_event: eventName,
          role: role ?? "unknown",
          is_test: String(Boolean(isTest)),
        },
        extra: sanitizeMonitoringMetadata(metadata),
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
