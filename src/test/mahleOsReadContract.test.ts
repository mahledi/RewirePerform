import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readRepoFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

const edgeSource = () => readRepoFile("supabase/functions/mahleos-read/index.ts");
const machineAuthSource = () => readRepoFile(
  "supabase/functions/_shared/mahleOsMachineAuth.ts",
);
const machineAuthCoreSource = () => readRepoFile(
  "supabase/functions/_shared/mahleOsMachineAuthCore.ts",
);
const migrationSource = () => readRepoFile(
  "supabase/migrations/20260721082355_add_mahleos_operational_read_contract.sql",
);

describe("MahleOS operational read contract", () => {
  it("uses one rotatable 256-bit machine credential for both machine endpoints", () => {
    const edge = edgeSource();
    const evidence = readRepoFile("supabase/functions/evidence-read/index.ts");
    const auth = machineAuthSource();
    const authCore = machineAuthCoreSource();
    const config = readRepoFile("supabase/config.toml");

    expect(edge).toContain('authenticateMahleOsMachine(req)');
    expect(evidence).toContain('authenticateMahleOsMachine(req)');
    expect(auth).toContain('Deno.env.get("MAHLEOS_REWIRE_API_KEY")');
    expect(auth).toContain('Deno.env.get("MAHLEOS_REWIRE_API_KEY_PREVIOUS")');
    expect(authCore).toContain("/^[a-f0-9]{64}$/iu");
    expect(authCore).toContain("constantTimeEqual");
    expect(config).toContain("[functions.mahleos-read]\nverify_jwt = false");
    expect(config).toContain("[functions.evidence-read]\nverify_jwt = false");
  });

  it("accepts only bounded allow-listed JSON requests and exposes no browser CORS", () => {
    const edge = edgeSource();

    expect(edge).toContain('req.method !== "POST"');
    expect(edge).toContain('contentType !== "application/json"');
    expect(edge).toContain("readBoundedRequestText(req, 2048)");
    expect(edge).toContain("ALLOWED_BODY_KEYS");
    expect(edge).toContain("ALLOWED_VIEWS");
    expect(edge).toContain("UUID_PATTERN.test(programRunId)");
    expect(edge).toContain('"Cache-Control": "no-store"');
    expect(edge).not.toContain("Access-Control-Allow-Origin");
  });

  it("can call only the dedicated service-only RPC and never selects live tables", () => {
    const edge = edgeSource();

    expect(edge).toContain('rpc("read_mahleos_operational_view"');
    expect(edge).not.toContain(".from(");
    expect(edge).not.toContain("feedback_text");
    expect(edge).not.toContain("journal_text");
    expect(edge).not.toContain("free_reflection");
  });

  it("limits the database contract to fixed aggregate views with append-only audit", () => {
    const migration = migrationSource();

    for (const view of [
      "daily_brief",
      "system_health",
      "tracking_quality",
      "feedback_status",
      "pilot_readiness",
    ]) {
      expect(migration).toContain(`'${view}'`);
    }
    expect(migration).toContain("mahleos_operations_access_log_append_only");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("recent_requests >= 30");
    expect(migration).toContain("multiple_run_instances");
    expect(migration).toContain("run_instance_team_mismatches");
    expect(migration).toContain("run_instances_outside_team_roster");
    expect(migration).toContain("'reporting_timezone', 'UTC'");
    expect(migration).toContain("extensions.digest(convert_to(payload::text, 'UTF8'), 'sha256')");
    expect(migration).toContain("FROM PUBLIC, anon, authenticated");
    expect(migration).toContain("TO service_role");
  });

  it("exports feedback counts and technical aggregates without private payloads", () => {
    const migration = migrationSource();

    expect(migration).toContain("feedback_text_exported', false");
    expect(migration).toContain("user_identifiers_exported', false");
    expect(migration).not.toContain("f.message");
    expect(migration).not.toContain("ael.metadata");
    expect(migration).not.toContain("p.full_name");
    expect(migration).not.toContain("p.email");
    expect(migration).not.toMatch(/jsonb_build_object\(\s*'user_id'/u);
  });

  it("keeps pilot output count-only and explicitly excludes test data", () => {
    const migration = migrationSource();

    expect(migration).toContain("'test_data_included', false");
    expect(migration).toContain("'TEST_EXCLUDED'");
    expect(migration).toContain("NOT COALESCE(p.is_test_user, false)");
    expect(migration).toContain("NOT COALESCE(pi.is_test_instance, false)");
    expect(migration).toContain("minimum_aggregate_n', 5");
    expect(migration).toContain("'individual_scores'");
    expect(migration).toContain("'missing_player_lists'");
    expect(migration).not.toContain("target_team.name");
  });
});
