import { supabase } from "@/integrations/supabase/client";

export const DATA_CONTRIBUTION_CONSENT_VERSION = "data_contribution_v1_2026_06";

export type DataContributionConsentState = boolean | null;

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
};
