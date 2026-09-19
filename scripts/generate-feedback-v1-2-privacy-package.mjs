#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const checkOnly = process.argv.includes("--check");
const manifestPath = "docs/feedback-intelligence/contracts/feedback-v1.2-privacy/producer-package-manifest.json";
const packageFiles = [
  ".env.example",
  "scripts/validate-release-target.mjs",
  "src/pages/Privacy.tsx",
  "src/content/feedbackTextConsentV12.ts",
  "src/content/guardianFeedbackTextPolicyV12.ts",
  "src/lib/feedbackIntelligenceApi.ts",
  "src/lib/feedbackIntelligencePersistence.ts",
  "src/components/feedback-intelligence/FeedbackCheckpointGate.tsx",
  "src/components/feedback-intelligence/FeedbackQuestionnairePreview.tsx",
  "src/components/settings/FeedbackTextConsentSettings.tsx",
  "src/pages/AccountSettings.tsx",
  "src/components/admin/AdminFeedbackIntelligenceComments.tsx",
  "src/lib/adminFeedbackComments.ts",
  "supabase/migrations/20260814141647_admin_feedback_comment_review_v1_1.sql",
  "supabase/migrations/20260820080207_structured_feedback_v1_2_activation_contract.sql",
  "supabase/migrations/20260824121000_feedback_jarvis_structured_only_v1_2.sql",
  "supabase/migrations/20260824143000_feedback_machine_reader_net_privilege_hardening_v1_2.sql",
  "supabase/migrations/20260824150000_feedback_jarvis_structured_contract_v1_2.sql",
  "supabase/functions/mahleos-feedback-structured-production-read/index.ts",
  "docs/feedback-intelligence/contracts/v1.2.0-structured-only-draft/structured-export.schema.json",
  "docs/feedback-intelligence/contracts/v1.2.0-structured-only-draft/consumer-contract.json",
  "docs/feedback-intelligence/contracts/v1.2.0-structured-only-draft/jarvis-consumer-package-pin.json",
  "docs/V1_2_FEEDBACK_INTELLIGENCE_READINESS_2026-08-20.md",
  "docs/V1_2_FEEDBACK_CONTROLLER_ASSESSMENT_2026-08-21.md",
  "docs/V1_2_STRUCTURED_JARVIS_CONTROLLER_SUPPLEMENT_2026-08-24.md",
  "docs/APP_STORE_CONNECT_V1_2_STRUCTURED_JARVIS_DELTA_2026-08-24.md",
  "docs/feedback-intelligence/APP_STORE_PRIVACY_DRAFT.md",
  "src/test/feedbackPrivacyV12.test.ts",
  "src/test/feedbackJarvisStructuredOnlyV12.test.ts",
  "src/test/feedbackJarvisStructuredContractV12.test.ts",
  "src/test/feedbackMachineReaderNetPrivilegeHardeningV12.test.ts",
  "src/test/releaseTarget.test.ts",
  "src/test/feedbackIntelligenceApi.test.ts",
  "src/test/feedbackIntelligencePreview.test.tsx",
  "src/test/feedbackTextConsentSettings.test.tsx",
  "src/test/feedbackV12ActivationContract.test.ts",
  "src/test/feedbackV12ActivationSmoke.test.ts",
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
  schema_version: "rewireperform-feedback-v1.2-privacy-package-v1",
  package_version: "feedback-v1.2-privacy-v1.1.0",
  status: "LOCAL_REVIEW_CANDIDATE_NOT_ACTIVATED",
  scope: {
    structured_checkpoints: true,
    optional_product_feedback_text: true,
    separate_text_consent: true,
    under_16_guardian_plus_athlete_gate: true,
    max_raw_text_retention_days: 365,
    protected_admin_read_only_review: true,
    jarvis_structured_feedback_access: true,
    jarvis_product_feedback_text_access: false,
    jarvis_minimum_group_size: 5,
    jarvis_subject_references_in_memory_only: true,
    jarvis_model_training: false,
    jarvis_automated_individual_decisions: false,
    external_ai_processor: false,
    journals_or_private_reflections: false,
    coach_individual_access: false,
  },
  activation: {
    production_database_activated: false,
    production_feedback_collection_enabled: false,
    production_text_collection_enabled: false,
    production_jarvis_reader_enabled: false,
    app_store_v1_2_submitted: false,
  },
  package_digest_algorithm: "sha256 over exact UTF-8 lines of sha256, two spaces and relative path in manifest order",
  package_sha256: sha256(digestInput.join("")),
  files,
};
const serialized = `${JSON.stringify(manifest, null, 2)}\n`;

if (checkOnly) {
  const current = await readFile(resolve(root, manifestPath), "utf8");
  if (current !== serialized) throw new Error(`${manifestPath}: generated manifest drift`);
  if (!Object.values(manifest.activation).every((value) => value === false)) {
    throw new Error("V1.2 Feedback Intelligence activation gate unexpectedly open");
  }
  console.log(JSON.stringify({
    status: "FEEDBACK_V1_2_PRIVACY_PACKAGE_VERIFIED_NOT_ACTIVATED",
    package_sha256: manifest.package_sha256,
    files: files.length,
  }, null, 2));
} else {
  await writeFile(resolve(root, manifestPath), serialized, "utf8");
  console.log(`${manifestPath} written`);
}
