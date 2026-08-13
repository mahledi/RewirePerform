#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const checkOnly = process.argv.includes("--check");
const manifestPath =
  "docs/feedback-intelligence/contracts/consent-v1.1/producer-package-manifest.json";
const packageFiles = [
  "src/content/feedbackTextConsentV11.ts",
  "src/content/guardianFeedbackTextPolicyV11.ts",
  "src/components/feedback-intelligence/FeedbackQuestionnairePreview.tsx",
  "src/pages/GuardianDecision.tsx",
  "src/pages/Privacy.tsx",
  "src/pages/Settings.tsx",
  "supabase/migrations/20260813115737_feedback_consent_guardian_de_v1_1_final_contract.sql",
  "scripts/verify-feedback-consent-v1-1-final-contract-sql.mjs",
  "src/test/feedbackConsentV11Contract.test.ts",
  "src/test/feedbackIntelligencePreview.test.tsx",
  "src/test/feedbackTextConsentSettings.test.tsx",
  "docs/feedback-intelligence/FINAL_DE_CONSENT_GUARDIAN_CONTRACT_V1_1.md",
  "docs/feedback-intelligence/APP_STORE_PRIVACY_DRAFT.md",
  "docs/feedback-intelligence/APP_STORE_REVIEW_HANDOFF_V1_1.md",
  "docs/APP_STORE_CONNECT_V1_1_SUBMISSION_DRAFT_2026-08-11.md",
];

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const files = [];
const digestInput = [];

for (const path of packageFiles) {
  const bytes = await readFile(resolve(root, path));
  const digest = sha256(bytes);
  files.push({ path, sha256: digest });
  digestInput.push(`${digest}  ${path}\n`);
}

const manifest = {
  schema_version: "rewireperform-feedback-consent-producer-package-manifest-v1",
  contract_version: "feedback-consent-de-v1.1.0",
  contract_status: "LOCAL_REVIEW_CANDIDATE_NOT_ACTIVATED",
  generated_at: "2026-08-13T12:30:00+02:00",
  producer_branch: "codex/v1-1-apple-integration-20260810",
  producer_base_commit: "e190cb0d8623997c46856df3dc93c8ea85922a94",
  package_signed: false,
  package_status: "LOCAL_UNSIGNED_AWAITING_INDEPENDENT_REVIEW",
  digest_algorithm: "sha256",
  package_digest_algorithm:
    "sha256 over exact UTF-8 lines of sha256, two spaces and relative path in manifest order",
  package_sha256: sha256(digestInput.join("")),
  files,
  release_scope: {
    jurisdiction: "DE",
    product_minimum_age: 13,
    guardian_required_below_age: 16,
    guardian_age_range: "13-15",
    athlete_self_decision_age_range: "16-17",
    non_de_status: "out_of_scope",
  },
  notice_pins: {
    scope: "product-improvement-individual-text-ai-analysis-v1",
    athlete_consent_version: "feedback-text-consent-v1.1.0",
    athlete_notice_sha256:
      "c308e8ad3d89b02c308a07090a4c09cb363f9cdb7d1e5d671ac295c545d95a16",
    guardian_policy_reference: "guardian-feedback-text-de-v1.1.0",
    guardian_notice_sha256:
      "90b0ede2a1a7671f1631e2048a605e6331006972ee05e63d38d229857f0aeb0b",
    raw_text_retention_days: 365,
    processor_mode: "no_external_processor",
  },
  historical_semantics_boundary: {
    contract_version: "0.3.3-draft",
    manifest_sha256:
      "eccdf05956b68d457d3fc2135e3984d2b56242e4742fc3379152587bc5e7c33f",
    can_authorize_this_contract: false,
  },
  activation: {
    independent_consumer_review_complete: false,
    legal_privacy_minor_review_complete: false,
    production_migration_applied: false,
    campaigns_active: false,
    athlete_collection_enabled: false,
    text_collection_enabled: false,
    privacy_notice_ready: false,
    app_store_declaration_ready: false,
    minor_policy_ready: false,
    guardian_policy_active: false,
    jarvis_production_credential_present: false,
    jarvis_real_data_read_enabled: false,
  },
};

const serialized = `${JSON.stringify(manifest, null, 2)}\n`;

if (checkOnly) {
  const current = await readFile(resolve(root, manifestPath), "utf8");
  if (current !== serialized) {
    console.error(`${manifestPath}: generated manifest drift`);
    process.exit(1);
  }

  console.log(JSON.stringify({
    status: "FINAL_DE_CONSENT_PACKAGE_VERIFIED_ALL_ACTIVATION_GATES_CLOSED",
    manifest_sha256: sha256(current),
    package_sha256: manifest.package_sha256,
    files: files.length,
    activation_gates_closed: Object.values(manifest.activation).every((value) => value === false),
  }, null, 2));
} else {
  await writeFile(resolve(root, manifestPath), serialized, "utf8");
  console.log(`${manifestPath} written`);
}
