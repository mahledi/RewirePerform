import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(resolve(
  "supabase/contracts/jarvis_deep_analysis_bridge_v1.sql",
), "utf8");

describe("Jarvis deep-analysis prepared database contract", () => {
  it("keeps the queue private and grants only bounded functions", () => {
    expect(sql).toContain("CREATE SCHEMA IF NOT EXISTS jarvis_private");
    expect(sql).toContain("FORCE ROW LEVEL SECURITY");
    expect(sql).toContain("REVOKE ALL ON TABLE jarvis_private.deep_analysis_jobs FROM PUBLIC, anon, authenticated, service_role");
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.request_jarvis_deep_analysis(text, text, jsonb) TO authenticated");
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.claim_jarvis_deep_analysis_job(text) TO service_role");
    expect(sql).not.toMatch(/GRANT\s+(SELECT|INSERT|UPDATE|DELETE).*deep_analysis_jobs/iu);
  });

  it("uses verified admin identity and empty search paths", () => {
    expect(sql).toContain("actor_id uuid := auth.uid()");
    expect(sql).toContain("app_private.is_admin(actor_id)");
    expect(sql.match(/SET search_path = ''/gu)).toHaveLength(4);
    expect(sql).not.toContain("raw_user_meta_data");
  });

  it("deduplicates by question and snapshot and blocks private output", () => {
    expect(sql).toContain("UNIQUE (created_by, request_key)");
    expect(sql).toContain("ON CONFLICT (created_by, request_key) DO NOTHING");
    expect(sql).toContain("job.status = 'LAEUFT' AND job.claimed_by = _worker_id");
    expect(sql).toContain("status = 'LAEUFT' AND claimed_by = _worker_id");
    expect(sql).toContain("ORDER BY (job.status = 'LAEUFT') DESC");
    expect(sql).toContain("_worker_id text,\n  _status text");
    expect(sql).toContain("DESCRIPTIVE_STRUCTURED_ONLY");
    for (const value of ["subject_reference", "journal", "free_text", "individual_score"]) {
      expect(sql).toContain(value);
    }
  });

  it("is explicitly non-deployable preparation until CLI migration generation", () => {
    expect(sql).toContain("PREPARED CONTRACT ONLY");
    expect(sql).toContain("supabase migration new jarvis_deep_analysis_bridge_v1");
  });
});
