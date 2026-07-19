import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260714224000_performance_evidence_56d_v1.sql"),
  "utf8",
);
const minorUpgradeMigration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260719085701_guardian_personalization_v2.sql"),
  "utf8",
);

const functionBody = (name: string, nextName?: string) => {
  const start = migration.indexOf(`CREATE OR REPLACE FUNCTION public.${name}`);
  const end = nextName
    ? migration.indexOf(`CREATE OR REPLACE FUNCTION public.${nextName}`, start + 1)
    : migration.length;
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return migration.slice(start, end);
};

describe("performance evidence migration boundaries", () => {
  it("keeps all seven evidence tables behind RLS and explicit table revokes", () => {
    const tables = [
      "evidence_protocols",
      "evidence_transfer_schedule",
      "evidence_participation_eligibility",
      "evidence_eligibility_audit",
      "athlete_transfer_observations",
      "coach_evidence_reviews",
      "coach_evidence_observations",
    ];

    for (const table of tables) {
      expect(migration).toContain(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`);
      expect(migration).toContain(`REVOKE ALL ON TABLE public.${table} FROM PUBLIC, anon, authenticated;`);
    }
  });

  it("defines the same 16-day schedule as the client protocol", () => {
    const scheduleRows = migration.match(/\('56d-transfer-v1-2026-07',\s*\d+/g) ?? [];
    expect(scheduleRows).toHaveLength(16);
    for (const day of [4, 7, 11, 14, 18, 21, 25, 28, 32, 35, 39, 42, 46, 49, 53, 56]) {
      expect(migration).toMatch(new RegExp(`\\('56d-transfer-v1-2026-07',\\s*${day},`));
    }
  });

  it("keeps minors on a prepared but disabled guardian-consent and assent path", () => {
    expect(migration).toContain("minor_collection_enabled boolean NOT NULL DEFAULT false");
    expect(migration).toContain("'guardian_consent_and_athlete_assent_confirmed'");
    expect(migration).toContain("RETURN 'minor_participation_not_enabled'");
    expect(migration).not.toMatch(/\bdate_of_birth\s+(date|text|timestamptz)/i);
    expect(migration).not.toMatch(/\bbirthdate\s+(date|text|timestamptz)/i);
  });

  it("adds transfer evidence only after the existing atomic daily save", () => {
    const body = functionBody("save_daily_tracking_v3", "set_evidence_adult_eligibility");
    const baseSave = body.indexOf("base_result := public.save_daily_tracking_v2");
    const evidenceInsert = body.indexOf("INSERT INTO public.athlete_transfer_observations");

    expect(baseSave).toBeGreaterThanOrEqual(0);
    expect(evidenceInsert).toBeGreaterThan(baseSave);
    expect(body).toContain("evidence_replaces_optional_reflection");
    expect(body).toContain("evidence_observation_already_locked");
    expect(body).toContain("evidence_schedule_mismatch");
    expect(body).toContain("invalid_evidence_response_duration");
    expect(body).toContain("response_duration_ms");
    expect(body).toContain("FROM public.profiles p\n  WHERE p.id = actor_id\n  FOR SHARE");
    expect(body).toContain("FROM public.evidence_participation_eligibility epe");
  });

  it("prevents direct individual coach evidence from reaching aggregate exports", () => {
    const body = functionBody("get_performance_evidence_summary");
    expect(body).toContain("cer.scope_type = 'team'");
    expect(body).toContain("'individual_coach_reviews_excluded'");
    expect(body).toContain("'individual_coach_values_exported', false");
    expect(body).toContain("'expected_transfer_observations'");
    expect(body).toContain("'missing_transfer_observations'");
    expect(body).toContain("'exclusion_reasons'");
    expect(body).toContain("ur.role = 'athlete'::public.app_role");
    expect(body).toContain("uda.context_type <> 'rest' AS expected");
    expect(body).toContain("COUNT(DISTINCT user_id) FILTER (WHERE score IS NOT NULL) >= 5");
    expect(body).toContain("observed_athlete_count");
    expect(body).toContain("LEAST(MIN(cer.observed_athlete_count)::integer, ers.athlete_n) >= 5");
    expect(body).toContain("'coach_team_values_suppressed_below_n'");
    expect(body).not.toContain("full_name");
    expect(body).not.toContain("email");
    expect(body).not.toContain("ato.reflection");
    expect(body).not.toContain("daily_journals");
  });

  it("validates exactly five coach domains with portable PostgreSQL primitives", () => {
    const body = functionBody("save_coach_evidence_review", "get_my_transfer_evidence_summary");
    expect(body).toContain("FROM jsonb_object_keys(_observations)");
    expect(body).toContain("observation_key_count <> 5");
    expect(body).toContain("FOR SHARE OF p");
    expect(body).toContain("FOR SHARE OF epe");
    expect(body).not.toContain("jsonb_object_length");
  });

  it("grants browser roles only the intended RPC surface", () => {
    for (const signature of [
      "get_my_evidence_status(uuid, text, integer, text)",
      "save_daily_tracking_v3(\n  uuid, date, text, integer, text, uuid, jsonb, text,",
      "set_evidence_adult_eligibility(uuid, boolean)",
      "get_admin_evidence_eligibility(boolean)",
      "get_coach_evidence_review_context(uuid, text)",
      "save_coach_evidence_review(text, uuid, uuid, text, integer, text, jsonb, integer)",
      "get_my_transfer_evidence_summary(uuid, text)",
      "get_performance_evidence_summary(uuid, boolean, text)",
    ]) {
      expect(migration).toContain(`GRANT EXECUTE ON FUNCTION public.${signature}`);
    }
  });
});

describe("performance evidence minor activation upgrade", () => {
  it("retires V1 and pins the active V2 protocol to current consent receipts", () => {
    expect(minorUpgradeMigration).toContain("SET status = 'retired'");
    expect(minorUpgradeMigration).toContain("'56d-transfer-v2-2026-07'");
    expect(minorUpgradeMigration).toContain("'data_contribution_v3_2026_07'");
    expect(minorUpgradeMigration).toContain("'guardian_decision_v2_2026_07'");
    expect(minorUpgradeMigration).toContain("'athlete_assent_v2_2026_07'");
    expect(minorUpgradeMigration).toMatch(/true,\s*true,\s*true,\s*'guardian_decision_v2_2026_07'/u);
  });

  it("copies the locked schedule and synchronizes only active, fully authorized minors", () => {
    expect(minorUpgradeMigration).toContain("WHERE source.protocol_version = '56d-transfer-v1-2026-07'");
    expect(minorUpgradeMigration).toContain("participant.data_contribution_athlete = true");
    expect(minorUpgradeMigration).toContain("participant.data_contribution_guardian = true");
    expect(minorUpgradeMigration).toContain("pi.status = 'active'");
    expect(minorUpgradeMigration).toContain("CREATE TRIGGER minor_auth_sync_evidence");
    expect(minorUpgradeMigration).toContain("CREATE TRIGGER minor_auth_sync_new_program_instance");
  });

  it("removes personal transfer records after an explicit pilot withdrawal", () => {
    expect(minorUpgradeMigration).toContain("DELETE FROM public.athlete_transfer_observations");
    expect(minorUpgradeMigration).toContain("DELETE FROM public.coach_evidence_reviews");
    expect(minorUpgradeMigration).toContain("cer.scope_type = 'athlete'");
    expect(minorUpgradeMigration).not.toContain("DELETE FROM public.coach_evidence_observations");
  });
});
