import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(resolve(
  process.cwd(),
  "supabase/migrations/20260824143000_feedback_machine_reader_net_privilege_hardening_v1_2.sql",
), "utf8");

describe("V1.2 feedback machine reader network privilege hardening", () => {
  it("removes inherited pg_net execution without changing the public schema", () => {
    expect(migration).toContain("REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA net FROM PUBLIC");
    expect(migration).not.toContain("REVOKE USAGE ON SCHEMA public");
    expect(migration).not.toContain("REVOKE USAGE ON SCHEMA net");
  });

  it("preserves only Supabase's explicit pg_net callers", () => {
    const explicitGrant = migration.match(
      /GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA net TO([\s\S]*?);/u,
    )?.[1] ?? "";
    for (const role of [
      "supabase_admin",
      "supabase_functions_admin",
      "postgres",
      "anon",
      "authenticated",
      "service_role",
    ]) {
      expect(explicitGrant).toContain(role);
    }
    expect(explicitGrant).not.toContain("mahleos_feedback_production_reader");
  });

  it("fails closed unless the reader has exactly one feedback function and no unrelated functions", () => {
    expect(migration).toContain("feedback_reader_net_execute_not_closed");
    expect(migration).toContain("feedback_reader_public_execute_not_closed");
    expect(migration).toContain("feedback_reader_function_scope_invalid");
    expect(migration).toContain("reader_feedback_function_count <> 1");
  });

  it("does not activate credentials, exports, or real-data gates", () => {
    expect(migration).not.toContain("PASSWORD");
    expect(migration).not.toContain("production_export_enabled = true");
    expect(migration).not.toContain("machine_credential_ready = true");
    expect(migration).not.toContain("real_data");
  });
});
