import { supabase } from "@/integrations/supabase/client";

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
  constructor(public readonly code: string) {
    super(code);
  }
}

const invoke = async (body: Record<string, unknown>): Promise<MinorAuthorizationStatus> => {
  const { data, error } = await supabase.functions.invoke("minor-guardian-user", { body });
  if (error) {
    const context = (error as { context?: { json?: () => Promise<unknown> } }).context;
    const payload = await context?.json?.().catch(() => null) as { error?: unknown } | null;
    throw new MinorAuthorizationError(typeof payload?.error === "string" ? payload.error : "service_unavailable");
  }
  if (!data || typeof data !== "object" || typeof data.state !== "string") {
    throw new MinorAuthorizationError("invalid_response");
  }
  return data as MinorAuthorizationStatus;
};

export const getMinorAuthorizationStatus = () => invoke({ action: "status" });
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
  athlete_first_name?: string | null;
  policy_key?: string;
}

const invokePublic = async <T extends object>(body: Record<string, unknown>): Promise<T> => {
  const { data, error } = await supabase.functions.invoke("minor-guardian-public", { body });
  if (error) throw new MinorAuthorizationError("link_unavailable");
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
) => invokePublic<{ state: "approved" | "declined"; receiptDelivery: "not_required" | "sent" | "failed"; manageUrl: string | null }>({
  action: "decide",
  token,
  productAuthorized,
  dataContributionAuthorized,
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
