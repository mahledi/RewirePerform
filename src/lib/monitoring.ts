import * as Sentry from "@sentry/react";
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
};

const PUBLIC_SENTRY_DSN_FALLBACK =
  "https://5c55886d9d44ba4aa6d1379a09868d03@o4511431236124672.ingest.de.sentry.io/4511431305920592";

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || PUBLIC_SENTRY_DSN_FALLBACK;
const APP_ENV = import.meta.env.VITE_APP_ENV || import.meta.env.MODE || "development";
const RELEASE_SHA = import.meta.env.VITE_RELEASE_SHA;

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

export const initMonitoring = () => {
  if (!SENTRY_DSN) return;

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: APP_ENV,
    release: RELEASE_SHA || undefined,
    tracesSampleRate: APP_ENV === "production" ? 0.05 : 0,
    beforeSend(event) {
      if (event.user) {
        event.user = { id: event.user.id };
      }
      delete event.request?.cookies;
      delete event.request?.headers;
      return event;
    },
  });
};

export const setMonitoringUser = (input: {
  userId: string | null;
  role?: AppRole;
  isTest?: boolean | null;
}) => {
  if (!SENTRY_DSN) return;

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
};

export const trackAppEvent = async ({
  eventName,
  status = "success",
  role,
  teamId,
  route,
  errorCode,
  isTest,
  metadata,
}: TrackAppEventInput) => {
  try {
    await (supabase as any).from("app_event_log").insert({
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
}: CaptureAppErrorInput) => {
  if (SENTRY_DSN) {
    Sentry.captureException(error, {
      tags: {
        app_event: eventName,
        role: role ?? "unknown",
        is_test: String(Boolean(isTest)),
      },
      extra: sanitizeMetadata(metadata),
    });
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
