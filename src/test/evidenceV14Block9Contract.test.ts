import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { DATA_CONTRIBUTION_CONSENT_VERSION } from "@/lib/dataContributionConsent";
import {
  guardianPolicyCopy,
  guardianPolicyDetails,
  MINOR_DATA_CONTRIBUTION_VERSION,
} from "@/content/minorPolicy";

const read = (path: string) => readFileSync(resolve(path), "utf8");

describe("V1.4 Block 9 privacy and activation contract", () => {
  it("pins the internal V3 decision to the narrow core without activating the protocol", () => {
    const baseMigration = read("supabase/migrations/20260901101823_v1_4_evidence_block_9_controls.sql");
    const alignmentMigration = read("supabase/migrations/20260902093000_v1_4_core_scope_privacy_alignment.sql");
    expect(DATA_CONTRIBUTION_CONSENT_VERSION).toBe("data_contribution_v3_2026_07");
    expect(MINOR_DATA_CONTRIBUTION_VERSION).toBe(DATA_CONTRIBUTION_CONSENT_VERSION);
    expect(baseMigration).toContain("'data_contribution_v3_2026_07'");
    expect(baseMigration).toContain("'conditionally_compatible'");
    expect(alignmentMigration).toContain("'approved_core_scope'");
    expect(alignmentMigration).toContain("source_family = 'coach_observation'");
    expect(alignmentMigration).toContain("activation_status = 'blocked'");
    expect(alignmentMigration).toContain("'push_behavior_analysis'");
    expect(alignmentMigration).toContain("'external_match_data'");
    expect(baseMigration).toContain("evidence_v1_4_block_9_incomplete");
    expect(`${baseMigration}\n${alignmentMigration}`).not.toMatch(/UPDATE\s+evidence_derived\.analysis_protocols\s+SET\s+status\s*=\s*'active'/i);
  });

  it("keeps the consented data classes and private-text exclusions aligned", () => {
    const questionnaire = read("src/components/questionnaire/QuestionnaireIntro.tsx");
    const privacy = read("src/pages/Privacy.tsx");
    const accountSettings = read("src/pages/AccountSettings.tsx");
    const block9 = read("docs/evidence-v1.4/BLOCK_9_PRIVACY_COMPATIBILITY.md");
    expect(questionnaire).toContain("Nutzungs-, Fortschritts-, Check-in-, Assessment-");
    expect(questionnaire).toContain("Transferdaten");
    expect(questionnaire).toContain("Private Journaltexte und freie Antworten werden dafür nie verwendet");
    expect(privacy).toContain("Gruppenaggregate werden erst ab mindestens fünf freigegebenen Personen");
    expect(privacy).toContain("spätestens 365 Tage nach Speicherung im Evidenzmodell");
    expect(accountSettings).toContain("intern pseudonymisierte, strukturierte Nutzungs-");
    expect(accountSettings).toContain("aggregiert oder");
    expect(block9).toContain("Diagnose, Behandlung oder psychologisches Personenprofil");
    expect(block9).toContain("Pseudonymisierung");
  });

  it("retains the stronger guardian wording while keeping coach observations outside the core", () => {
    const block9 = read("docs/evidence-v1.4/BLOCK_9_PRIVACY_COMPATIBILITY.md");
    expect(guardianPolicyCopy.contributionDetail).toContain("freigegebene Coach-Beobachtungsdaten");
    expect(guardianPolicyDetails.rights.join(" ")).toContain("widerrufen");
    expect(block9).toContain("der allgemeine Einwilligungsbutton nicht ausdrücklich");
    expect(block9).toContain("V4-Transparenz- und Einwilligungsentscheidung");
  });

  it("enforces withdrawal, retention, least privilege and source-mapping gates", () => {
    const migration = read("supabase/migrations/20260901101823_v1_4_evidence_block_9_controls.sql");
    expect(migration).toContain("erase_evidence_v1_4_on_contribution_withdrawal");
    expect(migration).toContain("now() - interval '365 days'");
    expect(migration).toContain("mapping_required");
    expect(migration).toContain("REVOKE ALL ON evidence_private.governance_gates FROM PUBLIC, anon, authenticated");
    expect(migration).toContain("REVOKE ALL ON FUNCTION evidence_private.get_activation_readiness_v1_4()");
    expect(migration).toContain("NOT ('causality' = ANY(permitted_claim_classes))");
  });
});
