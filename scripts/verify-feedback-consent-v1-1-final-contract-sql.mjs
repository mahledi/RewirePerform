import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const migrationPath =
  "supabase/migrations/20260813115737_feedback_consent_guardian_de_v1_1_final_contract.sql";
const migration = readFileSync(resolve(migrationPath), "utf8");

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const expectFailure = async (task, expectedMessage) => {
  try {
    await task();
  } catch (error) {
    assert(
      String(error).toLowerCase().includes(expectedMessage.toLowerCase()),
      `Expected ${expectedMessage}, received ${String(error)}`,
    );
    return;
  }
  throw new Error(`Expected failure containing ${expectedMessage}`);
};

const prepareCurrentProductionContract = async ({ openGate = false } = {}) => {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role;
    CREATE SCHEMA feedback_core;
    CREATE SCHEMA feedback_consent;

    CREATE TABLE feedback_core.campaigns(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      campaign_reference text NOT NULL UNIQUE,
      text_consent_scope text NOT NULL,
      text_consent_version text NOT NULL,
      text_notice_hash text NOT NULL,
      status text NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    INSERT INTO feedback_core.campaigns(
      campaign_reference,
      text_consent_scope,
      text_consent_version,
      text_notice_hash,
      status
    )
    SELECT
      campaign_reference,
      'product-improvement-individual-text-ai-analysis-v1',
      'feedback-text-consent-v1.1.0-draft',
      '4f067f11e8ba0075989ba3af730cfcac3849e6e406da97227defa92ac41dfda7',
      'draft'
    FROM unnest(ARRAY[
      'feedback-day-10-v1',
      'feedback-day-24-v1',
      'feedback-day-39-v1',
      'feedback-day-55-v1'
    ]) campaign_reference;

    CREATE TABLE feedback_core.system_settings(
      singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
      athlete_collection_enabled boolean NOT NULL DEFAULT false,
      text_collection_enabled boolean NOT NULL DEFAULT false,
      privacy_notice_ready boolean NOT NULL DEFAULT false,
      app_store_declaration_ready boolean NOT NULL DEFAULT false,
      minor_policy_ready boolean NOT NULL DEFAULT false,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    INSERT INTO feedback_core.system_settings(singleton, athlete_collection_enabled)
    VALUES (true, ${openGate ? "true" : "false"});

    CREATE TABLE feedback_core.jurisdiction_policies(
      jurisdiction text PRIMARY KEY CHECK (jurisdiction IN ('DE', 'AT', 'CH')),
      policy_version text NOT NULL UNIQUE,
      product_minimum_age smallint NOT NULL DEFAULT 15
        CONSTRAINT jurisdiction_policies_product_minimum_age_check CHECK (product_minimum_age = 15),
      product_guardian_required_below_age smallint NOT NULL DEFAULT 16,
      structured_collection_status text NOT NULL,
      raw_text_collection_status text NOT NULL,
      legal_review_reference text,
      approved_at timestamptz,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    INSERT INTO feedback_core.jurisdiction_policies(
      jurisdiction,
      policy_version,
      product_minimum_age,
      product_guardian_required_below_age,
      structured_collection_status,
      raw_text_collection_status
    ) VALUES
      ('DE', 'feedback-jurisdiction-minor-de-v1.0.0', 15, 16, 'legal_review_required', 'legal_review_required'),
      ('AT', 'feedback-jurisdiction-minor-at-v1.0.0', 15, 16, 'out_of_scope', 'out_of_scope'),
      ('CH', 'feedback-jurisdiction-minor-ch-v1.0.0', 15, 16, 'out_of_scope', 'out_of_scope');

    CREATE TABLE feedback_consent.guardian_text_policy_versions(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      jurisdiction text NOT NULL CHECK (jurisdiction = 'DE'),
      policy_reference text NOT NULL UNIQUE,
      scope text NOT NULL,
      consent_version text NOT NULL,
      guardian_notice_hash text NOT NULL,
      athlete_notice_hash text NOT NULL,
      raw_text_retention_days smallint NOT NULL,
      processor_mode text NOT NULL,
      processor_reference text,
      status text NOT NULL CHECK (status IN ('draft', 'active', 'retired')),
      effective_from timestamptz,
      retired_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(policy_reference, scope, consent_version, guardian_notice_hash, athlete_notice_hash)
    );
    INSERT INTO feedback_consent.guardian_text_policy_versions(
      jurisdiction,
      policy_reference,
      scope,
      consent_version,
      guardian_notice_hash,
      athlete_notice_hash,
      raw_text_retention_days,
      processor_mode,
      status
    ) VALUES (
      'DE',
      'guardian-feedback-text-de-v1.1.0-draft',
      'product-improvement-individual-text-ai-analysis-v1',
      'feedback-text-consent-v1.1.0-draft',
      '4b7c6f6cbf3d932c2e244d6a281f0d45056706eeb6108cb2ac2303dbe0f19c4f',
      '4f067f11e8ba0075989ba3af730cfcac3849e6e406da97227defa92ac41dfda7',
      365,
      'no_external_processor',
      'draft'
    );
  `);
  return db;
};

const db = await prepareCurrentProductionContract();
await db.exec(migration);

const campaignResult = await db.query(`
  SELECT count(*)::integer AS count
  FROM feedback_core.campaigns
  WHERE status = 'draft'
    AND text_consent_version = 'feedback-text-consent-v1.1.0'
    AND text_notice_hash = 'c308e8ad3d89b02c308a07090a4c09cb363f9cdb7d1e5d671ac295c545d95a16'
`);
assert(campaignResult.rows[0].count === 4, "all four campaigns must pin the final consent while remaining draft");

const jurisdictionResult = await db.query(`
  SELECT * FROM feedback_core.jurisdiction_policies ORDER BY jurisdiction
`);
const de = jurisdictionResult.rows.find((row) => row.jurisdiction === "DE");
const nonDe = jurisdictionResult.rows.filter((row) => row.jurisdiction !== "DE");
assert(de.policy_version === "feedback-jurisdiction-minor-de-v1.1.0", "DE policy version must advance additively");
assert(de.product_minimum_age === 13, "DE product minimum must be 13");
assert(de.product_guardian_required_below_age === 16, "DE Guardian threshold must remain under 16");
assert(de.structured_collection_status === "legal_review_required", "DE structured gate must remain closed");
assert(de.raw_text_collection_status === "legal_review_required", "DE text gate must remain closed");
assert(nonDe.every((row) => row.structured_collection_status === "out_of_scope"), "non-DE structured scope must stay closed");
assert(nonDe.every((row) => row.raw_text_collection_status === "out_of_scope"), "non-DE text scope must stay closed");

const policyResult = await db.query(`
  SELECT *
  FROM feedback_consent.guardian_text_policy_versions
  WHERE policy_reference = 'guardian-feedback-text-de-v1.1.0'
`);
assert(policyResult.rows.length === 1, "one exact final Guardian policy candidate must exist");
assert(policyResult.rows[0].status === "draft", "final Guardian copy must not be activated by registration");
assert(policyResult.rows[0].effective_from === null, "draft Guardian policy must not have an effective date");

const gates = await db.query(`SELECT * FROM feedback_core.system_settings WHERE singleton`);
assert(
  [
    "athlete_collection_enabled",
    "text_collection_enabled",
    "privacy_notice_ready",
    "app_store_declaration_ready",
    "minor_policy_ready",
  ].every((key) => gates.rows[0][key] === false),
  "registration must not open any runtime gate",
);

const rejectedDb = await prepareCurrentProductionContract({ openGate: true });
await expectFailure(
  () => rejectedDb.exec(migration),
  "feedback_consent_final_contract_requires_closed_runtime_gates",
);

console.log(JSON.stringify({
  status: "FINAL_DE_CONSENT_CONTRACT_REGISTERED_LOCALLY_ALL_RUNTIME_GATES_CLOSED",
  migration: migrationPath,
  product_minimum_age: 13,
  guardian_required_below_age: 16,
  campaigns: 4,
  guardian_policy_status: "draft",
  de_policy_status: "legal_review_required",
  non_de_status: "out_of_scope",
}, null, 2));
