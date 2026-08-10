#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const checkOnly = process.argv.includes("--check");
const manifestPath = "docs/feedback-intelligence/contracts/v0.2.1/producer-package-manifest.json";
const packageFiles = [
  "docs/feedback-intelligence/contracts/v0.2.1/proposed-export.schema.json",
  "docs/feedback-intelligence/contracts/v0.2.1/producer-decisions.json",
  "supabase/migrations/20260714224000_performance_evidence_56d_v1.sql",
  "supabase/migrations/20260719085701_guardian_personalization_v2.sql",
  "supabase/migrations/20260810122749_feedback_intelligence_transfer_pulse_count_v0_2_1.sql",
  "scripts/verify-feedback-transfer-pulse-sql.mjs",
  "docs/feedback-intelligence/TRANSFER_PULSE_COUNT_HANDOFF_V0_2_1_DRAFT.md"
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
  schema_version: "rewireperform-feedback-transfer-pulse-producer-package-manifest-v1",
  contract_version: "0.2.1-draft",
  contract_status: "PRODUCER_CONFIRMED_DRAFT_NOT_ACTIVATED",
  generated_at: "2026-08-10T12:30:00+02:00",
  producer_branch: "codex/feedback-intelligence-v1-1-20260805",
  package_signed: false,
  package_status: "LOCAL_UNSIGNED_AWAITING_CONSUMER_REVIEW",
  digest_algorithm: "sha256",
  package_digest_algorithm:
    "sha256 over the exact UTF-8 output of shasum -a 256 for files in manifest order, including two spaces and each relative path",
  package_sha256: sha256(digestInput.join("")),
  files,
  export_pins: {
    schema_sha256: "e90eb3fc2ce717ef91ae35bcfcd5bc7944d3cc941faa8f071b42e934e967023d",
    activity_source_contract_version: "feedback-activity-counts-v1.1.0",
    checkpoint_maxima: { "10": 2, "24": 6, "39": 11, "55": 15 },
    capture_definition_sha256: "af65a494d503b49e1e8edc8fe65d00c85009af6e3adfedd2e0f9ee0836249072",
    internal_export_definition_sha256: "534d0d8770899566658b7efb68c6bc31cfecc068dcf5cf94c30f09143b2ab043",
    gateway_definition_sha256: "d08d3fbf17420570ad6e8f29f0e3e19717a874f19a767c8eb7c7656acf7aedfd"
  },
  privacy: {
    count_only: true,
    not_observed_counts_as_completed: true,
    score_exported: false,
    text_exported: false,
    direct_identifiers_exported: false,
    journal_reflection_support_text_exported: false,
    observational_not_causal: true
  },
  activation: {
    consumer_pin_ready: false,
    synthetic_export_enabled: false,
    production_export_enabled: false,
    machine_credential_ready: false,
    privacy_notice_ready: false,
    app_store_declaration_ready: false,
    minor_policy_ready: false,
    real_data_read_enabled: false
  },
  invalidated_historical_gate: {
    contract_version: "0.2.0-draft",
    can_authorize_this_package: false,
    reason: "TRANSFER_PULSE_WAS_NULL_ONLY"
  }
};

const serialized = `${JSON.stringify(manifest, null, 2)}\n`;
if (checkOnly) {
  const current = await readFile(resolve(root, manifestPath), "utf8");
  if (current !== serialized) {
    console.error(`${manifestPath}: generated manifest drift`);
    process.exit(1);
  }
  console.log(JSON.stringify({
    status: "TRANSFER_PULSE_PRODUCER_PACKAGE_VERIFIED_NOT_ACTIVATED",
    manifest_sha256: sha256(current),
    package_sha256: manifest.package_sha256,
    files: files.length,
    activation_gates_closed: Object.values(manifest.activation).every((value) => value === false)
  }, null, 2));
} else {
  await writeFile(resolve(root, manifestPath), serialized, "utf8");
  console.log(`${manifestPath} written`);
}
