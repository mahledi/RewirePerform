import { supabase } from "@/integrations/supabase/client";

export const DATA_CONTRIBUTION_CONSENT_VERSION = "data_contribution_v1_2026_06";

export type DataContributionConsentState = boolean | null;

const pendingConsentKey = (userId: string) => `rewire:pending_data_contribution_consent:${userId}`;

export const isConsentSchemaMissingError = (error: unknown): boolean => {
  const maybeError = error as { code?: string; message?: string } | null;
  const message = maybeError?.message?.toLowerCase() ?? "";
  return (
    maybeError?.code === "PGRST204" ||
    maybeError?.code === "42703" ||
    message.includes("data_contribution_consent") ||
    message.includes("schema cache")
  );
};

export const rememberPendingDataContributionConsent = (userId: string, consent: boolean) => {
  try {
    localStorage.setItem(
      pendingConsentKey(userId),
      JSON.stringify({
        consent,
        version: DATA_CONTRIBUTION_CONSENT_VERSION,
        saved_locally_at: new Date().toISOString(),
      }),
    );
  } catch {
    // Local fallback is best-effort only; consent is not counted until persisted.
  }
};

export const clearPendingDataContributionConsent = (userId: string) => {
  try {
    localStorage.removeItem(pendingConsentKey(userId));
  } catch {
    // Ignore storage cleanup failures.
  }
};

export const getPendingDataContributionConsent = (userId: string): boolean | null => {
  try {
    const raw = localStorage.getItem(pendingConsentKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { consent?: unknown };
    return typeof parsed.consent === "boolean" ? parsed.consent : null;
  } catch {
    return null;
  }
};

export const saveDataContributionConsent = async (
  userId: string,
  consent: boolean,
): Promise<void> => {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("profiles")
    .update({
      data_contribution_consent: consent,
      data_contribution_consent_version: DATA_CONTRIBUTION_CONSENT_VERSION,
      data_contribution_consented_at: consent ? now : null,
      data_contribution_updated_at: now,
    })
    .eq("id", userId);

  if (error) throw error;
  clearPendingDataContributionConsent(userId);
};

export const syncPendingDataContributionConsent = async (userId: string): Promise<boolean | null> => {
  const pending = getPendingDataContributionConsent(userId);
  if (pending === null) return null;
  await saveDataContributionConsent(userId, pending);
  return pending;
};
