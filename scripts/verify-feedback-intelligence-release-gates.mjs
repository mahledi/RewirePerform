#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();

const readText = (path) => readFile(resolve(root, path), "utf8");
const readJson = async (path) => JSON.parse(await readText(path));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function verifyPackage(manifestPath, sourceCommit = null) {
  const manifest = await readJson(manifestPath);
  const digestInput = [];

  for (const entry of manifest.files) {
    const content = sourceCommit
      ? execFileSync("git", ["show", `${sourceCommit}:${entry.path}`], {
          cwd: root,
          maxBuffer: 20 * 1024 * 1024,
        })
      : await readFile(resolve(root, entry.path));
    const actual = sha256(content);
    assert(actual === entry.sha256, `${manifestPath}: hash drift for ${entry.path}`);
    digestInput.push(`${entry.sha256}  ${entry.path}\n`);
  }

  assert(
    sha256(digestInput.join("")) === manifest.package_sha256,
    `${manifestPath}: package digest drift`,
  );

  assert(
    Object.values(manifest.activation).every((value) => value === false),
    `${manifestPath}: an activation gate is unexpectedly open`,
  );

  return {
    contract_version: manifest.contract_version,
    source_commit: sourceCommit,
    files: manifest.files.length,
    package_sha256: manifest.package_sha256,
    activation_gates_closed: true,
  };
}

const v02Manifest = "docs/feedback-intelligence/contracts/v0.2/producer-package-manifest.json";
const v021Manifest = "docs/feedback-intelligence/contracts/v0.2.1/producer-package-manifest.json";
const v03Manifest = "docs/feedback-intelligence/contracts/v0.3/producer-package-manifest.json";
const v02AcceptedProducerCommit = "c0a80af4e8d6bb5c5092646913bef1283e19083b";
const policyPath = "src/content/guardianFeedbackTextPolicy.ts";
const guardianMigrationPath = "supabase/migrations/20260805145921_guardian_feedback_text_authorization_v1.sql";
const athleteNoticeMigrationPath = "supabase/migrations/20260810122000_feedback_text_consent_notice_v1_1.sql";
const guardianNoticeMigrationPath = "supabase/migrations/20260810122100_guardian_feedback_text_notice_v1_1.sql";
const transactionMigrationPath = "supabase/migrations/20260805103700_feedback_intelligence_v1_transaction_api.sql";
const machineMigrationPath = "supabase/migrations/20260805104000_feedback_intelligence_v0_2_machine_export.sql";
const fkIndexesMigrationPath = "supabase/migrations/20260806081925_feedback_intelligence_fk_indexes.sql";
const combinedStagingPostdeployScriptPath = "scripts/generate-feedback-combined-staging-postdeploy.mjs";
const credentiallessStagingPreflightScriptPath = "scripts/generate-feedback-credentialless-staging-preflight.mjs";
const currentCombinedStagingPostdeployScriptPath =
  "scripts/generate-feedback-combined-staging-postdeploy-v0-2.mjs";
const currentCredentiallessStagingPreflightScriptPath =
  "scripts/generate-feedback-credentialless-staging-preflight-v0-2.mjs";
const currentSyntheticCycleScriptPath =
  "scripts/generate-feedback-intelligence-synthetic-cycle-v0-3.mjs";
const currentPostreadEvidencePath =
  "docs/feedback-intelligence/contracts/synthetic-staging-one-read-v0.3/postread-evidence-v0.3.3.json";
const productionActivationDecisionPath = "docs/V1_1_PRODUCTION_DATA_ACTIVATION_DECISION_2026-08-11.md";
const currentAcceptances = {
  semantics: "a5563f83bcaef42d743ee898cdf02331d7965d18b88ab4ad431bde35f6176818",
  gateway: "a2a236212b7e4e1f5c6ce323c9ddd9ee1b583f4f1974bcb251a33603f4a0f8d6",
  postdeploy: "0941fd066378e4e5ec16435dc2c789dde9476f9073e24921c695be49f6981164",
  credentiallessPreflight: "adcf46dbc00a5db16872b5ddf74fbe3a0dd86ddfabfa32917d7de1a857b373fd",
  syntheticPostread: "243ee7568846ce209ea84bc9e001fd8f892ecc4248921206fa3ec923bfadf2f4",
};

const expectedPolicy = {
  reference: "guardian-feedback-text-de-v1.1.0-draft",
  scope: "product-improvement-individual-text-ai-analysis-v1",
  consentVersion: "feedback-text-consent-v1.1.0-draft",
  guardianNoticeHash: "4b7c6f6cbf3d932c2e244d6a281f0d45056706eeb6108cb2ac2303dbe0f19c4f",
  athleteNoticeHash: "4f067f11e8ba0075989ba3af730cfcac3849e6e406da97227defa92ac41dfda7",
  retentionDays: 365,
  processorMode: "no_external_processor",
};

try {
  const [
    v02,
    v021,
    v03,
    policy,
    guardianMigration,
    athleteNoticeMigration,
    guardianNoticeMigration,
    transactionMigration,
    machineMigration,
    fkIndexesMigration,
    productionActivationDecision,
    currentPostreadEvidence,
  ] = await Promise.all([
    verifyPackage(v02Manifest, v02AcceptedProducerCommit),
    verifyPackage(v021Manifest),
    verifyPackage(v03Manifest),
    readText(policyPath),
    readText(guardianMigrationPath),
    readText(athleteNoticeMigrationPath),
    readText(guardianNoticeMigrationPath),
    readText(transactionMigrationPath),
    readText(machineMigrationPath),
    readText(fkIndexesMigrationPath),
    readText(productionActivationDecisionPath),
    readJson(currentPostreadEvidencePath),
  ]);

  assert(v021.contract_version === "0.2.1-draft", "transfer pulse contract version drift");
  assert(v03.contract_version === "0.3.3-draft", "feedback semantics contract version drift");
  const v021ManifestJson = await readJson(v021Manifest);
  const v03ManifestSource = await readText(v03Manifest);
  const historicalV032ManifestSha = "cb5d8df3a20903e08f874294f14d149f4e6615f26381e6118d4f5dd4e74f34df";
  assert(
    sha256(v03ManifestSource) !== historicalV032ManifestSha,
    "v0.3.3 must not reuse the historical v0.3.2 manifest bytes",
  );
  assert(
    v021ManifestJson.export_pins.schema_sha256
      === "e90eb3fc2ce717ef91ae35bcfcd5bc7944d3cc941faa8f071b42e934e967023d",
    "transfer pulse export schema pin drift",
  );
  assert(
    JSON.stringify(v021ManifestJson.export_pins.checkpoint_maxima)
      === JSON.stringify({ "10": 2, "24": 6, "39": 11, "55": 15 }),
    "transfer pulse checkpoint maxima drift",
  );
  assert(
    v021ManifestJson.invalidated_historical_gate.can_authorize_this_package === false,
    "v0.2.0 historical assurance must not authorize v0.2.1",
  );

  for (const indexName of [
    "feedback_consent_audit_submission_idx",
    "feedback_checkpoint_campaign_idx",
    "feedback_checkpoint_program_instance_idx",
    "feedback_subject_links_program_instance_idx",
  ]) {
    assert(
      fkIndexesMigration.includes(indexName),
      `${fkIndexesMigrationPath}: missing required index ${indexName}`,
    );
  }

  for (const value of [
    expectedPolicy.reference,
    expectedPolicy.scope,
    expectedPolicy.consentVersion,
    expectedPolicy.guardianNoticeHash,
  ]) {
    assert(policy.includes(value), `${policyPath}: missing canonical value ${value}`);
    assert(guardianNoticeMigration.includes(value), `${guardianNoticeMigrationPath}: missing canonical value ${value}`);
  }

  for (const value of [expectedPolicy.athleteNoticeHash, expectedPolicy.processorMode]) {
    assert(guardianNoticeMigration.includes(value), `${guardianNoticeMigrationPath}: missing canonical value ${value}`);
  }

  for (const value of [expectedPolicy.scope, expectedPolicy.consentVersion, expectedPolicy.athleteNoticeHash]) {
    assert(athleteNoticeMigration.includes(value), `${athleteNoticeMigrationPath}: missing canonical value ${value}`);
  }

  assert(
    policy.includes(`GUARDIAN_FEEDBACK_TEXT_RETENTION_DAYS = ${expectedPolicy.retentionDays}`),
    `${policyPath}: retention drift`,
  );
  assert(
    guardianNoticeMigration.includes(`  ${expectedPolicy.retentionDays},`),
    `${guardianNoticeMigrationPath}: retention drift`,
  );
  assert(
    guardianNoticeMigration.includes("'draft'"),
    `${guardianNoticeMigrationPath}: guardian policy is not draft-bound`,
  );

  assert(
    guardianMigration.includes("feedback_consent.guardian_text_policy_ready('DE')"),
    `${guardianMigrationPath}: guardian runtime gate missing`,
  );

  for (const gate of [
    "athlete_collection_enabled boolean NOT NULL DEFAULT false",
    "text_collection_enabled boolean NOT NULL DEFAULT false",
    "privacy_notice_ready boolean NOT NULL DEFAULT false",
    "app_store_declaration_ready boolean NOT NULL DEFAULT false",
    "minor_policy_ready boolean NOT NULL DEFAULT false",
  ]) {
    assert(transactionMigration.includes(gate), `${transactionMigrationPath}: missing closed gate ${gate}`);
  }

  for (const gate of [
    "synthetic_export_enabled boolean NOT NULL DEFAULT false",
    "production_export_enabled boolean NOT NULL DEFAULT false",
    "privacy_notice_ready boolean NOT NULL DEFAULT false",
    "app_store_declaration_ready boolean NOT NULL DEFAULT false",
    "minor_policy_ready boolean NOT NULL DEFAULT false",
  ]) {
    assert(machineMigration.includes(gate), `${machineMigrationPath}: missing closed gate ${gate}`);
  }

  assert(
    machineMigration.includes("REVOKE ALL ON FUNCTION public.read_feedback_intelligence_v0_2_draft"),
    `${machineMigrationPath}: machine RPC execute revoke missing`,
  );

  // The checked postdeploy and credentialless packages remain immutable evidence
  // for v0.3.2. They must not be regenerated as if they covered the new v0.3.3
  // questionnaire bytes and additive draft-only registry migration.
  execFileSync(process.execPath, [combinedStagingPostdeployScriptPath, "--check"], {
    cwd: root,
    stdio: "pipe",
    maxBuffer: 20 * 1024 * 1024,
  });

  execFileSync(process.execPath, [credentiallessStagingPreflightScriptPath, "--check"], {
    cwd: root,
    stdio: "pipe",
    maxBuffer: 20 * 1024 * 1024,
  });

  for (const [label, acceptance] of Object.entries({
    semantics: currentAcceptances.semantics,
    gateway: currentAcceptances.gateway,
    postdeploy: currentAcceptances.postdeploy,
    credentiallessPreflight: currentAcceptances.credentiallessPreflight,
  })) {
    assert(
      Object.values(currentPostreadEvidence.accepted_pins).includes(acceptance),
      `${currentPostreadEvidencePath}: missing current ${label} acceptance ${acceptance}`,
    );
  }
  assert(
    productionActivationDecision.includes(currentAcceptances.syntheticPostread),
    `${productionActivationDecisionPath}: missing final synthetic postread acceptance`,
  );
  assert(currentPostreadEvidence.network_request_count === 1, "v0.3.3 synthetic request-count drift");
  assert(currentPostreadEvidence.production === false, "v0.3.3 synthetic evidence must not authorize Production");
  assert(currentPostreadEvidence.real_data_read === false, "v0.3.3 synthetic evidence must not authorize real data");
  assert(
    Object.values(currentPostreadEvidence.gate_close).every((value) => value === false),
    "v0.3.3 postread runtime gate unexpectedly open",
  );
  for (const script of [
    currentCombinedStagingPostdeployScriptPath,
    currentCredentiallessStagingPreflightScriptPath,
    currentSyntheticCycleScriptPath,
  ]) {
    execFileSync(process.execPath, [script, "--check"], {
      cwd: root,
      stdio: "pipe",
      maxBuffer: 20 * 1024 * 1024,
    });
  }

  console.log(JSON.stringify({
    status: "LOCAL_RELEASE_GATES_VERIFIED_EXTERNAL_GATES_CLOSED",
    release_scope: "DE_ONLY",
    v02,
    v021,
    v03,
    guardian_policy: {
      reference: expectedPolicy.reference,
      scope: expectedPolicy.scope,
      consent_version: expectedPolicy.consentVersion,
      retention_days: expectedPolicy.retentionDays,
      status: "draft",
      processor_mode: expectedPolicy.processorMode,
    },
    external_activation: false,
    real_jarvis_reads_possible: false,
    historical_v0_3_2_staging_postdeploy_evidence_verified: true,
    historical_v0_3_2_credentialless_preflight_verified: true,
    current_v0_3_3_consumer_acceptance_complete: true,
    current_v0_3_3_staging_assurance_complete: true,
    current_v0_3_3_credentialless_preflight_complete: true,
    current_v0_3_3_synthetic_connectivity_complete: true,
    current_v0_3_3_synthetic_request_count: 1,
    current_v0_3_3_all_credentials_removed: true,
    production_and_real_data_gates_closed: true,
    next_gate: "PRODUCTION_MIGRATION_ROLLBACK_DRY_RUN_THEN_SEPARATE_PERSISTENT_APPLY",
  }, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : "Feedback Intelligence release-gate verification failed");
  process.exit(1);
}
