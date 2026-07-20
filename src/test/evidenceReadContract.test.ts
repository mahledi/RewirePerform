import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readRepoFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

const edgeSource = () => readRepoFile("supabase/functions/evidence-read/index.ts");
const apiMigration = () => readRepoFile(
  "supabase/migrations/20260720082953_add_evidence_read_api_contract.sql",
);
const runEvidenceMigration = () => readRepoFile(
  "supabase/migrations/20260720090000_unify_program_run_evidence_eligibility.sql",
);

describe("read-only machine Evidence API contract", () => {
  it("requires a dedicated machine secret and performs constant-time authentication", () => {
    const source = edgeSource();
    const config = readRepoFile("supabase/config.toml");

    expect(source).toContain('Deno.env.get("MAHLEOS_EVIDENCE_API_KEY")');
    expect(source).toContain("configuredKey.length < 32");
    expect(source).toContain("constantTimeEqual");
    expect(source).toContain('crypto.subtle.digest("SHA-256"');
    expect(source).toContain('authorization.replace(/^Bearer\\s+/iu, "")');
    expect(config).toContain("[functions.evidence-read]\nverify_jwt = false");
  });

  it("accepts only bounded JSON POST requests without browser CORS access", () => {
    const source = edgeSource();

    expect(source).toContain('req.method !== "POST"');
    expect(source).toContain('contentType !== "application/json"');
    expect(source).toContain("encoder.encode(rawBody).byteLength > 4096");
    expect(source).toContain('"Cache-Control": "no-store"');
    expect(source).toContain('"Referrer-Policy": "no-referrer"');
    expect(source).not.toContain("Access-Control-Allow-Origin");
  });

  it("serves locked aggregate evidence instead of querying live athlete data", () => {
    const source = edgeSource();

    expect(source).toContain('rpc("read_evidence_data_lock_for_export"');
    for (const forbiddenSource of [
      '.from("profiles")',
      '.from("daily_checkins")',
      '.from("daily_journals")',
      '.from("questionnaire_responses")',
      '.from("assessments")',
      "journal_text",
      "free_reflection",
    ]) {
      expect(source).not.toContain(forbiddenSource);
    }
  });

  it("keeps the database read service-only, checksum-verified and fully audited", () => {
    const migration = apiMigration();

    expect(migration).toContain("edl.status = 'active'");
    expect(migration).toContain("extensions.digest(convert_to(target.evidence_payload::text, 'UTF8'), 'sha256')");
    expect(migration).toContain("target.analysis_manifest ->> 'content_checksum'");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("evidence_api_access_log_append_only");
    expect(migration).toContain("FROM PUBLIC, anon, authenticated");
    expect(migration).toContain("TO service_role");
    expect(migration).toContain("never athlete identifiers or evidence payloads");
  });

  it("freezes the complete program-run dossier in one versioned Data Lock", () => {
    const migration = runEvidenceMigration();

    expect(migration).toContain("'program-run-evidence-lock-v2-2026-07'");
    for (const section of [
      "team_pulse",
      "measurement",
      "outcomes",
      "transfer_evidence",
      "data_quality",
      "claim_boundary",
      "privacy",
    ]) {
      expect(migration).toContain(`'${section}'`);
    }
    expect(migration).toContain("extensions.digest(convert_to(payload::text, 'UTF8'), 'sha256')");
    expect(migration).toContain("'athlete_identifiers_exported', false");
  });

  it("freezes full Solo development and transfer evidence in the same locked contract", () => {
    const migration = runEvidenceMigration();

    expect(migration).toContain("'solo-sport-evidence-lock-v2-2026-07'");
    expect(migration).toContain("run_evidence := public.get_solo_development_evidence_summary(");
    expect(migration).toContain("transfer_evidence := public.get_solo_sport_evidence_summary(");
    for (const section of [
      "sport_catalog",
      "cohort_breakdown",
      "measurement",
      "outcomes",
      "weekly_state",
      "transfer_evidence",
    ]) {
      expect(migration).toContain(`'${section}'`);
    }
  });
});
