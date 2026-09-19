import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(resolve(
  process.cwd(),
  "supabase/migrations/20260824121000_feedback_jarvis_structured_only_v1_2.sql",
), "utf8");

describe("V1.2 Jarvis structured-only feedback boundary", () => {
  it("removes raw comment access from the dedicated machine role", () => {
    expect(migration).toContain("RENAME TO read_feedback_intelligence_production_v0_2_raw_internal");
    expect(migration).toMatch(/REVOKE ALL[\s\S]*read_feedback_intelligence_production_v0_2_raw_internal[\s\S]*mahleos_feedback_production_reader/u);
    expect(migration).not.toContain(
      "GRANT EXECUTE ON FUNCTION feedback_machine_production.read_feedback_intelligence_production_v0_2_raw_internal",
    );
  });

  it("forces every contract comment to JSON null before returning", () => {
    expect(migration).toContain("jsonb_set(item.value, '{comment}', 'null'::jsonb, false)");
    expect(migration).toContain("raw_text_boundary_failed");
    expect(migration).toContain("item -> 'comment' IS DISTINCT FROM 'null'::jsonb");
  });

  it("does not silently activate credentials or runtime gates", () => {
    expect(migration).not.toContain("ALTER ROLE mahleos_feedback_production_reader PASSWORD");
    expect(migration).not.toContain("production_export_enabled = true");
    expect(migration).not.toContain("machine_credential_ready = true");
  });
});
