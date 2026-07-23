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
  | "feedback_submitted"
  | "journal_saved"
  | "pre_training_opened"
  | "push_clicked"
  | "coach_dashboard_loaded"
  | "coach_evidence_load_failed"
  | "coach_evidence_save_failed"
  | "coach_mental_state_load_failed"
  | "evidence_status_load_failed"
  | "app_runtime_error"
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
    const { error } = await supabase.from("app_event_log").insert({
      event_name: eventName,
      status,
      role: role ?? null,
      team_id: teamId ?? null,
      route: sanitizeRoute(route ?? getRoute()),
      error_code: errorCode ? sanitizeDiagnosticToken(errorCode, "unknown_error") : null,
      is_test: Boolean(isTest),
      metadata: sanitizeMonitoringMetadata(metadata),
    });
    if (error) {
      console.warn(`[ops] app_event_log insert failed (${getErrorCode(error)})`);
    }
  } catch (error) {
    // Event logging must never break a user flow.
    console.warn(`[ops] app_event_log insert failed (${getErrorCode(error)})`);
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
