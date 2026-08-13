import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  FEEDBACK_TEXT_CONSENT_SCOPE_V11,
  FEEDBACK_TEXT_CONSENT_VERSION_V11,
  FEEDBACK_TEXT_NOTICE_HASH_V11,
  feedbackTextConsentCopyV11,
} from "@/content/feedbackTextConsentV11";
import {
  GUARDIAN_FEEDBACK_TEXT_CONSENT_VERSION_V11,
  GUARDIAN_FEEDBACK_TEXT_NOTICE_HASH_V11,
  GUARDIAN_FEEDBACK_TEXT_POLICY_REFERENCE_V11,
  GUARDIAN_FEEDBACK_TEXT_SCOPE_V11,
  guardianFeedbackTextCanonicalDocumentV11,
  guardianFeedbackTextPolicyCopyV11,
} from "@/content/guardianFeedbackTextPolicyV11";

const read = (path: string) => readFileSync(resolve(path), "utf8");
const migrationPath =
  "supabase/migrations/20260813115737_feedback_consent_guardian_de_v1_1_final_contract.sql";

describe("final DE V1.1 feedback consent and Guardian contract", () => {
  it("pins the final visible athlete notice without reusing the draft version", () => {
    const calculated = createHash("sha256")
      .update(JSON.stringify(feedbackTextConsentCopyV11))
      .digest("hex");

    expect(FEEDBACK_TEXT_CONSENT_VERSION_V11).toBe("feedback-text-consent-v1.1.0");
    expect(FEEDBACK_TEXT_CONSENT_VERSION_V11).not.toContain("draft");
    expect(FEEDBACK_TEXT_NOTICE_HASH_V11).toBe(calculated);
    expect(FEEDBACK_TEXT_CONSENT_SCOPE_V11)
      .toBe("product-improvement-individual-text-ai-analysis-v1");
  });

  it("keeps every structured question usable without an optional comment", () => {
    const copy = feedbackTextConsentCopyV11.body.join(" ");

    expect(copy).toContain("ohne einen Kommentar freizugeben");
    expect(copy).toContain("Ein Nein verändert weder dein Programm noch deine Auswahlantworten");
    expect(feedbackTextConsentCopyV11.acceptLabel).toBe("Ja, Kommentar freiwillig freigeben");
    expect(feedbackTextConsentCopyV11.declineLabel).toBe("Ohne Kommentar fortfahren");
    expect(copy).not.toMatch(/Diagnose|Behandlung|Therapie|Heilung|Krankheit/u);
  });

  it("pins the separate final Guardian notice and keeps the athlete choice explicit", () => {
    const calculated = createHash("sha256")
      .update(JSON.stringify(guardianFeedbackTextCanonicalDocumentV11))
      .digest("hex");
    const copy = Object.values(guardianFeedbackTextPolicyCopyV11).join(" ");

    expect(GUARDIAN_FEEDBACK_TEXT_POLICY_REFERENCE_V11)
      .toBe("guardian-feedback-text-de-v1.1.0");
    expect(GUARDIAN_FEEDBACK_TEXT_CONSENT_VERSION_V11).toBe(FEEDBACK_TEXT_CONSENT_VERSION_V11);
    expect(GUARDIAN_FEEDBACK_TEXT_SCOPE_V11).toBe(FEEDBACK_TEXT_CONSENT_SCOPE_V11);
    expect(GUARDIAN_FEEDBACK_TEXT_NOTICE_HASH_V11).toBe(calculated);
    expect(copy).toContain("Ohne Kommentar bleiben alle strukturierten Feedbackfragen nutzbar");
    expect(copy).toContain("Die Entscheidung ist freiwillig");
    expect(copy).not.toMatch(/Diagnose|Behandlung|Therapie|Heilung|Krankheit/u);
  });

  it("registers only additive final bytes and leaves every activation gate closed", () => {
    const migration = read(migrationPath);

    for (const value of [
      FEEDBACK_TEXT_CONSENT_VERSION_V11,
      FEEDBACK_TEXT_NOTICE_HASH_V11,
      GUARDIAN_FEEDBACK_TEXT_POLICY_REFERENCE_V11,
      GUARDIAN_FEEDBACK_TEXT_NOTICE_HASH_V11,
    ]) {
      expect(migration).toContain(`'${value}'`);
    }

    expect(migration).toContain("product_minimum_age = 13");
    expect(migration).toContain("product_guardian_required_below_age = 16");
    expect(migration).toContain("structured_collection_status = 'legal_review_required'");
    expect(migration).toContain("raw_text_collection_status = 'legal_review_required'");
    expect(migration).toContain("AND status = 'draft'");
    expect(migration).toContain("'draft'\n)");
    expect(migration).toContain("feedback_consent_final_contract_requires_closed_runtime_gates");
    expect(migration).not.toMatch(/SET\s+(athlete_collection_enabled|text_collection_enabled|privacy_notice_ready|app_store_declaration_ready|minor_policy_ready)\s*=\s*true/iu);
    expect(migration).not.toMatch(/GRANT\s+EXECUTE/iu);
  });

  it("keeps the accepted V0.3.3 semantics package immutable and creates a separate consent gate", () => {
    const historicalManifest = read("docs/feedback-intelligence/contracts/v0.3/producer-package-manifest.json");
    const historicalManifestHash = createHash("sha256").update(historicalManifest).digest("hex");

    expect(historicalManifestHash)
      .toBe("eccdf05956b68d457d3fc2135e3984d2b56242e4742fc3379152587bc5e7c33f");
    expect(historicalManifest).toContain('"contract_version": "0.3.3-draft"');
  });
});
