import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260727123000_admin_comprehension_insights_v1.sql",
  ),
  "utf8",
);

describe("admin comprehension insights migration", () => {
  it("is admin-only and suppresses scores below five distinct participants", () => {
    expect(migration).toContain("public.has_role(actor_id, 'admin'::public.app_role)");
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.get_admin_comprehension_insights");
    expect(migration).toContain("participants >= 5");
    expect(migration).toContain("'minimum_participants_for_scores', 5");
  });

  it("excludes test data and unanswered generated questions by default", () => {
    expect(migration).toContain("NOT COALESCE(p.is_test_user, false)");
    expect(migration).toContain("NOT COALESCE(pi.is_test_instance, false)");
    expect(migration).toContain("answer.item IS NOT NULL");
    expect(migration).toContain("jsonb_typeof(answer.item -> 'isCorrect') = 'boolean'");
  });

  it("returns no user identifiers, selected options, journals, or reflections", () => {
    const returnedPayload = migration.slice(migration.indexOf("SELECT pg_catalog.jsonb_build_object"));

    expect(returnedPayload).not.toContain("'user_id'");
    expect(returnedPayload).not.toContain("selectedOptionId");
    expect(returnedPayload).not.toContain("journal_text");
    expect(returnedPayload).not.toContain("q.reflection_text");
    expect(migration).toContain("'journal_or_reflection_text_included', false");
    expect(migration).toContain("'selected_options_included', false");
    expect(migration).toContain("'user_identifiers_included', false");
  });
});
