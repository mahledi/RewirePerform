import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260907085639_jarvis_coach_dashboard_observability_v1.sql",
  ),
  "utf8",
);

describe("Jarvis coach-dashboard observability v1.6", () => {
  it("compares the latest authenticated delivery with the server roster", () => {
    expect(migration).toContain("event.event_name = 'coach_dashboard_loaded'");
    expect(migration).toContain("event.role = 'coach'");
    expect(migration).toContain("SELECT DISTINCT ON (dashboard_events.team_id)");
    expect(migration).toContain("ORDER BY dashboard_events.team_id, dashboard_events.created_at DESC");
    expect(migration).toContain("delivery.expected_athletes");
    expect(migration).toContain("'roster_mismatches_24h'");
    expect(migration).toContain("'NO_RECENT_OBSERVATION'");
    expect(migration).toContain("'OBSERVED_MATCHING'");
  });

  it("excludes internal testing before the comparison", () => {
    expect(migration).toContain("NOT COALESCE(team.is_test_team, false)");
    expect(migration).toContain("NOT COALESCE(profile.is_test_user, false)");
    expect(migration).toContain("NOT COALESCE(event.is_test, false)");
  });

  it("keeps the wrapper private and the published aggregate identifier-free", () => {
    expect(migration).toContain("SECURITY DEFINER");
    expect(migration).toContain("SET search_path = pg_catalog");
    expect(migration).toContain("FROM PUBLIC, anon, authenticated, service_role");
    expect(migration).not.toMatch(/jsonb_build_object\([\s\S]*?'(?:user|team|coach)_id'/u);
    expect(migration).not.toContain("profile.full_name");
    expect(migration).not.toContain("profile.email");
    expect(migration).not.toContain("subject_reference");
    expect(migration).not.toContain("free_text");
  });

  it("publishes a strict v1.6 contract", () => {
    const schema = JSON.parse(readFileSync(
      resolve(process.cwd(), "docs/mahleos-handoff/contracts/v1/schemas/system-health.schema.json"),
      "utf8",
    ));
    const golden = JSON.parse(readFileSync(
      resolve(process.cwd(), "docs/mahleos-handoff/contracts/v1/golden/system-health.success.json"),
      "utf8",
    ));

    expect(schema.properties.schema_version.const).toBe("mahleos-system-health-v1.6");
    expect(schema.properties.critical_journey_coverage.required).toContain("coach_dashboard");
    expect(golden.data.critical_journey_coverage.coach_dashboard).toEqual({
      coverage: "AUTHENTICATED_DELIVERY_AND_SERVER_ROSTER_RECONCILIATION",
      authority: "authenticated_app_event_log_plus_server_roster",
      successful_deliveries_24h: 4,
      failures_24h: 0,
      roster_mismatches_24h: 0,
      unverifiable_successes_24h: 0,
      state: "OBSERVED_MATCHING",
    });
  });
});
