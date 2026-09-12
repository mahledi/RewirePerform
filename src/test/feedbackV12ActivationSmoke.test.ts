// @vitest-environment node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260820080207_structured_feedback_v1_2_activation_contract.sql"),
  "utf8",
);

const setup = async () => {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role;
    CREATE SCHEMA feedback_core;
    CREATE SCHEMA feedback_consent;
    CREATE SCHEMA minor_auth;

    CREATE TABLE feedback_core.system_settings(
      singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
      athlete_collection_enabled boolean NOT NULL DEFAULT false,
      text_collection_enabled boolean NOT NULL DEFAULT false,
      privacy_notice_ready boolean NOT NULL DEFAULT false,
      app_store_declaration_ready boolean NOT NULL DEFAULT false,
      minor_policy_ready boolean NOT NULL DEFAULT false,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    INSERT INTO feedback_core.system_settings(singleton) VALUES (true);

    CREATE TABLE feedback_core.campaigns(
      campaign_reference text PRIMARY KEY,
      questionnaire_version text NOT NULL,
      questionnaire_manifest_hash text NOT NULL,
      content_version text NOT NULL,
      text_consent_scope text NOT NULL,
      text_consent_version text NOT NULL,
      text_notice_hash text NOT NULL,
      status text NOT NULL CHECK (status IN ('draft','approved','active','paused','retired')),
      available_from timestamptz,
      available_until timestamptz,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    INSERT INTO feedback_core.campaigns VALUES
      ('feedback-day-10-v1','feedback-d10-v1.1.2','48c2bf887ec96a0cc49eb327b380f7da7d163beb08929b9b359bfa0356692f2c','feedback-intelligence-content-v1.1.2','product-improvement-individual-text-ai-analysis-v1','feedback-text-consent-v1.1.0','c308e8ad3d89b02c308a07090a4c09cb363f9cdb7d1e5d671ac295c545d95a16','draft',NULL,NULL,now()),
      ('feedback-day-24-v1','feedback-d24-v1.1.2','679f09ab0a4c08a0521404cbbef2d88a8f0121cb353c42f310a3f09cc20689e8','feedback-intelligence-content-v1.1.2','product-improvement-individual-text-ai-analysis-v1','feedback-text-consent-v1.1.0','c308e8ad3d89b02c308a07090a4c09cb363f9cdb7d1e5d671ac295c545d95a16','draft',NULL,NULL,now()),
      ('feedback-day-39-v1','feedback-d39-v1.1.2','b566002d6f1d0c74f1eafb8554f370fa7f409f871473717079a478ad7b238b44','feedback-intelligence-content-v1.1.2','product-improvement-individual-text-ai-analysis-v1','feedback-text-consent-v1.1.0','c308e8ad3d89b02c308a07090a4c09cb363f9cdb7d1e5d671ac295c545d95a16','draft',NULL,NULL,now()),
      ('feedback-day-55-v1','feedback-d55-v1.1.2','b8b1eb9e97348090e2993ee634dc0616228f6c1138b450174d132f48b1029600','feedback-intelligence-content-v1.1.2','product-improvement-individual-text-ai-analysis-v1','feedback-text-consent-v1.1.0','c308e8ad3d89b02c308a07090a4c09cb363f9cdb7d1e5d671ac295c545d95a16','draft',NULL,NULL,now());

    CREATE TABLE feedback_core.jurisdiction_policies(
      jurisdiction text PRIMARY KEY,
      policy_version text NOT NULL,
      product_minimum_age integer NOT NULL,
      product_guardian_required_below_age integer NOT NULL,
      structured_collection_status text NOT NULL,
      raw_text_collection_status text NOT NULL,
      legal_review_reference text,
      approved_at timestamptz,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    INSERT INTO feedback_core.jurisdiction_policies VALUES
      ('DE','feedback-jurisdiction-minor-de-v1.1.0',13,16,'legal_review_required','legal_review_required',NULL,NULL,now()),
      ('AT','feedback-jurisdiction-minor-at-v1.0.0',13,16,'out_of_scope','out_of_scope',NULL,NULL,now()),
      ('CH','feedback-jurisdiction-minor-ch-v1.0.0',13,16,'out_of_scope','out_of_scope',NULL,NULL,now());

    CREATE TABLE feedback_consent.guardian_text_policy_versions(
      jurisdiction text NOT NULL,
      policy_reference text PRIMARY KEY,
      scope text NOT NULL,
      consent_version text NOT NULL,
      guardian_notice_hash text NOT NULL,
      athlete_notice_hash text NOT NULL,
      raw_text_retention_days integer NOT NULL,
      processor_mode text NOT NULL,
      processor_reference text,
      status text NOT NULL CHECK (status IN ('draft','active','retired')),
      effective_from timestamptz,
      retired_at timestamptz,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    INSERT INTO feedback_consent.guardian_text_policy_versions VALUES
      ('DE','guardian-feedback-text-de-v1.1.0','product-improvement-individual-text-ai-analysis-v1','feedback-text-consent-v1.1.0','90b0ede2a1a7671f1631e2048a605e6331006972ee05e63d38d229857f0aeb0b','c308e8ad3d89b02c308a07090a4c09cb363f9cdb7d1e5d671ac295c545d95a16',365,'no_external_processor',NULL,'draft',NULL,NULL,now());

    CREATE FUNCTION minor_auth.enforcement_enabled() RETURNS boolean LANGUAGE sql STABLE AS
      'SELECT true';
    CREATE FUNCTION feedback_core.rollout_ready() RETURNS boolean LANGUAGE sql STABLE AS
      'SELECT athlete_collection_enabled AND privacy_notice_ready AND app_store_declaration_ready AND minor_policy_ready
       FROM feedback_core.system_settings WHERE singleton';
    CREATE FUNCTION feedback_core.jurisdiction_policy_ready(_jurisdiction text, _include_raw_text boolean DEFAULT false)
    RETURNS boolean LANGUAGE sql STABLE AS
      'SELECT COALESCE((SELECT structured_collection_status = ''approved''
        AND (NOT _include_raw_text OR raw_text_collection_status = ''approved'')
        AND legal_review_reference IS NOT NULL AND approved_at IS NOT NULL
        FROM feedback_core.jurisdiction_policies WHERE jurisdiction = _jurisdiction), false)';
  `);
  await db.exec(migration);
  return db;
};

const state = (db: PGlite) => db.query(`
  SELECT
    (SELECT count(*)::integer FROM feedback_core.campaigns WHERE status='active') AS campaigns,
    (SELECT count(*)::integer FROM feedback_consent.guardian_text_policy_versions WHERE status='active') AS guardian,
    (SELECT structured_collection_status FROM feedback_core.jurisdiction_policies WHERE jurisdiction='DE') AS structured,
    (SELECT raw_text_collection_status FROM feedback_core.jurisdiction_policies WHERE jurisdiction='DE') AS raw,
    (SELECT athlete_collection_enabled FROM feedback_core.system_settings WHERE singleton) AS athlete_gate,
    (SELECT text_collection_enabled FROM feedback_core.system_settings WHERE singleton) AS text_gate
`);

describe("V1.2 activation SQL smoke", () => {
  it("installs closed, opens both paths atomically and fully re-closes", async () => {
    const db = await setup();
    expect((await state(db)).rows[0]).toMatchObject({
      campaigns: 0,
      guardian: 0,
      structured: "legal_review_required",
      raw: "legal_review_required",
      athlete_gate: false,
      text_gate: false,
    });

    await expect(db.query(
      "SELECT feedback_core.activate_feedback_v1_2($1)",
      ["controller-assessment-de-feedback-v1.2:pending-review-2026"],
    )).rejects.toThrow("final_controller_assessment_required");

    const reference = "controller-assessment-de-feedback-v1.2:mahle-herzog-final-2026-08-20";
    await db.query("SELECT feedback_core.activate_feedback_v1_2($1)", [reference]);
    expect((await state(db)).rows[0]).toMatchObject({
      campaigns: 4,
      guardian: 1,
      structured: "approved",
      raw: "approved",
      athlete_gate: true,
      text_gate: true,
    });

    await db.query("SELECT feedback_core.reclose_feedback_v1_2($1)", [reference]);
    expect((await state(db)).rows[0]).toMatchObject({
      campaigns: 0,
      guardian: 0,
      structured: "paused",
      raw: "paused",
      athlete_gate: false,
      text_gate: false,
    });
    await db.close();
  });
});
