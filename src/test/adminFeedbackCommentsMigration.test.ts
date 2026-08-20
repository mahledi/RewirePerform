import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(resolve(
  process.cwd(),
  "supabase/migrations/20260814141647_admin_feedback_comment_review_v1_1.sql",
), "utf8");

describe("admin feedback comment review migration", () => {
  it("uses one purpose-bound admin RPC without direct raw-table grants", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.get_admin_feedback_comment_page(");
    expect(migration).toContain("NOT public.has_role(actor_id, 'admin'::public.app_role)");
    expect(migration).toContain("_purpose IS DISTINCT FROM 'pilot_product_feedback_review'");
    expect(migration).toContain("LIMIT _page_size + 1");
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.get_admin_feedback_comment_page");
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION public.get_admin_feedback_comment_page");
    expect(migration).not.toMatch(/GRANT\s+SELECT\s+ON\s+(TABLE\s+)?feedback_raw\.comments/i);
  });

  it("revalidates athlete and under-16 Guardian consent while excluding private text sources", () => {
    expect(migration).toContain("receipt.state = 'granted'");
    expect(migration).toContain("receipt.withdrawn_at IS NULL");
    expect(migration).toContain("receipt.minor_gate_state = 'guardian_scope_granted'");
    expect(migration).toContain("guardian.state = 'granted'");
    expect(migration).toContain("guardian.withdrawn_at IS NULL");
    expect(migration).toContain("journal_or_reflection_text_included', false");
    expect(migration).toContain("support_text_included', false");
    expect(migration).not.toContain("daily_journals");
    expect(migration).not.toContain("public.feedback ");
  });

  it("creates append-only access metadata without raw text or subject references", () => {
    const tableDefinition = migration.split("CREATE TABLE feedback_analysis.admin_comment_access_log (")[1]
      ?.split(");")[0] ?? "";
    expect(tableDefinition).toContain("actor_id uuid NOT NULL");
    expect(tableDefinition).toContain("returned_count smallint NOT NULL");
    expect(tableDefinition).not.toContain("raw_text");
    expect(tableDefinition).not.toContain("comment text");
    expect(tableDefinition).not.toContain("subject_reference");
    expect(migration).toContain("BEFORE UPDATE OR DELETE ON feedback_analysis.admin_comment_access_log");
  });
});
