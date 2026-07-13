import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260713140500_app_store_backend_function_repairs.sql",
  ),
  "utf8",
);
const sourceMigration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260627120000_nlz_evidence_tracking_v1.sql",
  ),
  "utf8",
);

function extractFunction(sql: string, functionName: string) {
  const marker = `CREATE OR REPLACE FUNCTION public.${functionName}`;
  const start = sql.indexOf(marker);
  const end = sql.indexOf("\n$$;", start);
  if (start === -1 || end === -1) {
    throw new Error(`Could not extract ${functionName}`);
  }
  return sql.slice(start, end + 4).trim();
}

describe("App Store backend function repairs", () => {
  it("removes both remote lint failures and keeps access explicit", () => {
    expect(migration).toContain("dc.date >= CURRENT_DATE - 7");
    expect(migration).not.toContain("(CURRENT_DATE - INTERVAL '7 days')::text");

    expect(migration).toContain("WHERE $2 IS NULL");
    expect(migration).toContain("WHERE sp.cohort_id = $2");
    expect(migration).not.toContain("WHERE cohort_id IS NULL");
    expect(migration).not.toContain("sp.cohort_id = cohort_id");

    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION public.get_team_stats(uuid) FROM PUBLIC, anon;",
    );
    expect(migration).toContain(
      "GRANT EXECUTE ON FUNCTION public.get_team_stats(uuid) TO authenticated;",
    );
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION public.get_admin_nlz_evidence_dossier(boolean, uuid) FROM PUBLIC, anon;",
    );
  });

  it("changes only ambiguous parameter references in the evidence dossier", () => {
    const original = extractFunction(
      sourceMigration,
      "get_admin_nlz_evidence_dossier",
    );
    const repaired = extractFunction(
      migration,
      "get_admin_nlz_evidence_dossier",
    )
      .replaceAll("$1", "include_test")
      .replaceAll("$2", "cohort_id");

    expect(repaired).toBe(original);
  });
});
