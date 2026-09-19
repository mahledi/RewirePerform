// @vitest-environment node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve("supabase/migrations/20260908125411_feedback_checkpoint_catch_up_v1_5.sql"),
  "utf8",
);

const actor = "00000000-0000-4000-8000-000000000001";
const instance = "10000000-0000-4000-8000-000000000001";

const setupDb = async () => {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE SCHEMA minor_auth;
    CREATE SCHEMA feedback_core;
    CREATE SCHEMA feedback_consent;

    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    CREATE FUNCTION minor_auth.enforcement_enabled() RETURNS boolean LANGUAGE sql STABLE AS $$
      SELECT true
    $$;
    CREATE FUNCTION public.get_effective_today(_user_id uuid) RETURNS date LANGUAGE sql STABLE AS $$
      SELECT current_setting('app.effective_today')::date
    $$;

    CREATE TABLE public.program_instances (
      id uuid PRIMARY KEY,
      user_id uuid NOT NULL,
      status text NOT NULL,
      started_at date NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE feedback_core.system_settings (
      singleton boolean PRIMARY KEY,
      text_collection_enabled boolean NOT NULL
    );
    CREATE TABLE feedback_core.campaigns (
      id uuid PRIMARY KEY,
      campaign_reference text NOT NULL UNIQUE,
      checkpoint_day smallint NOT NULL UNIQUE,
      questionnaire_version text NOT NULL,
      content_version text NOT NULL,
      questionnaire_manifest_hash text NOT NULL,
      text_consent_scope text NOT NULL,
      text_consent_version text NOT NULL,
      text_notice_hash text NOT NULL,
      status text NOT NULL,
      available_from timestamptz,
      available_until timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE feedback_core.submissions (
      id uuid PRIMARY KEY,
      campaign_id uuid NOT NULL,
      user_id uuid NOT NULL,
      program_instance_id uuid NOT NULL,
      status text NOT NULL,
      started_at timestamptz NOT NULL DEFAULT now(),
      client_submission_id uuid,
      client_revision integer NOT NULL DEFAULT 0
    );
    CREATE TABLE feedback_core.checkpoint_states (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL,
      campaign_id uuid NOT NULL,
      program_instance_id uuid NOT NULL,
      state text NOT NULL,
      first_eligible_at timestamptz NOT NULL DEFAULT now(),
      invited_at timestamptz NOT NULL DEFAULT now(),
      dismissed_at timestamptz,
      started_at timestamptz,
      submitted_at timestamptz,
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (user_id, campaign_id, program_instance_id)
    );
    CREATE TABLE feedback_consent.guardian_text_authorizations (
      user_id uuid,
      scope text,
      consent_version text,
      notice_hash text,
      state text,
      withdrawn_at timestamptz
    );

    CREATE FUNCTION feedback_core.rollout_ready() RETURNS boolean LANGUAGE sql STABLE AS $$
      SELECT true
    $$;
    CREATE FUNCTION feedback_core.jurisdiction_policy_ready(text, boolean) RETURNS boolean LANGUAGE sql STABLE AS $$
      SELECT true
    $$;
    CREATE FUNCTION feedback_core.actor_context(uuid)
    RETURNS TABLE(age_band text, jurisdiction text, product_authorized boolean) LANGUAGE sql STABLE AS $$
      SELECT 'adult'::text, 'DE'::text, true
    $$;

    INSERT INTO feedback_core.system_settings VALUES (true, false);
    INSERT INTO public.program_instances(id, user_id, status, started_at)
      VALUES ('${instance}', '${actor}', 'active', '2026-08-20');
    INSERT INTO feedback_core.campaigns(
      id, campaign_reference, checkpoint_day, questionnaire_version, content_version,
      questionnaire_manifest_hash, text_consent_scope, text_consent_version,
      text_notice_hash, status, available_from
    ) VALUES
      ('20000000-0000-4000-8000-000000000010', 'feedback-day-10-v1', 10, 'feedback-d10-v1.0.0',
       'feedback-intelligence-content-v1.0.0', repeat('a', 64), 'feedback-text-scope',
       'feedback-text-version', repeat('b', 64), 'active', '2026-08-01'),
      ('20000000-0000-4000-8000-000000000024', 'feedback-day-24-v1', 24, 'feedback-d24-v1.0.0',
       'feedback-intelligence-content-v1.0.0', repeat('c', 64), 'feedback-text-scope',
       'feedback-text-version', repeat('d', 64), 'active', '2026-08-01');

    SELECT set_config('request.jwt.claim.sub', '${actor}', false);
    SELECT set_config('app.effective_today', '2026-09-03', false);
  `);
  await db.exec(migration);
  return db;
};

describe("V1.5 feedback checkpoint catch-up", () => {
  it("claims the oldest missed checkpoint and preserves its scheduled day", async () => {
    const db = await setupDb();
    const result = await db.query<{ claim: Record<string, unknown> }>(
      "SELECT public.claim_my_feedback_checkpoint() AS claim",
    );

    expect(result.rows[0].claim).toMatchObject({
      eligible: true,
      mode: "invitation",
      checkpoint_day: 10,
      program_day: 15,
      is_overdue: true,
      days_overdue: 5,
    });
    expect((await db.query<{ count: number }>(`
      SELECT count(*)::integer AS count
      FROM feedback_core.checkpoint_states
      WHERE user_id = '${actor}' AND program_instance_id = '${instance}' AND state = 'invited'
    `)).rows[0].count).toBe(1);
    await db.close();
  });

  it("defers without losing the checkpoint and never lets a later checkpoint overtake it", async () => {
    const db = await setupDb();
    await db.query("SELECT public.claim_my_feedback_checkpoint()");
    const deferred = await db.query<{ result: Record<string, unknown> }>(
      "SELECT public.defer_my_feedback_checkpoint('feedback-day-10-v1') AS result",
    );
    expect(deferred.rows[0].result).toMatchObject({ ok: true, state: "invited" });

    await db.exec("SELECT set_config('app.effective_today', '2026-09-13', false)");
    const paused = await db.query<{ claim: Record<string, unknown> }>(
      "SELECT public.claim_my_feedback_checkpoint() AS claim",
    );
    expect(paused.rows[0].claim).toMatchObject({
      eligible: false,
      reason: "checkpoint_deferred",
    });

    await db.exec(`
      UPDATE feedback_core.checkpoint_states
      SET remind_after = clock_timestamp() - interval '1 second'
      WHERE user_id = '${actor}'
    `);
    const reminded = await db.query<{ claim: Record<string, unknown> }>(
      "SELECT public.claim_my_feedback_checkpoint() AS claim",
    );
    expect(reminded.rows[0].claim).toMatchObject({
      eligible: true,
      checkpoint_day: 10,
      program_day: 25,
      days_overdue: 15,
    });
    await db.close();
  });

  it("moves to the next due checkpoint only after an explicit terminal skip", async () => {
    const db = await setupDb();
    await db.query("SELECT public.claim_my_feedback_checkpoint()");
    await db.exec(`
      UPDATE feedback_core.checkpoint_states
      SET state = 'dismissed', dismissed_at = clock_timestamp()
      WHERE user_id = '${actor}'
    `);
    await db.exec("SELECT set_config('app.effective_today', '2026-09-13', false)");

    const result = await db.query<{ claim: Record<string, unknown> }>(
      "SELECT public.claim_my_feedback_checkpoint() AS claim",
    );
    expect(result.rows[0].claim).toMatchObject({
      eligible: true,
      checkpoint_day: 24,
      program_day: 25,
      days_overdue: 1,
    });
    await db.close();
  });

  it("keeps privileged functions authenticated and the new reminder RPC owner-scoped", async () => {
    const db = await setupDb();
    const grants = await db.query<{ anon_claim: boolean; anon_defer: boolean; auth_defer: boolean }>(`
      SELECT
        has_function_privilege('anon', 'public.claim_my_feedback_checkpoint()', 'EXECUTE') AS anon_claim,
        has_function_privilege('anon', 'public.defer_my_feedback_checkpoint(text)', 'EXECUTE') AS anon_defer,
        has_function_privilege('authenticated', 'public.defer_my_feedback_checkpoint(text)', 'EXECUTE') AS auth_defer
    `);
    expect(grants.rows[0]).toEqual({ anon_claim: false, anon_defer: false, auth_defer: true });

    await db.exec("SELECT set_config('request.jwt.claim.sub', '', false)");
    await expect(db.query("SELECT public.defer_my_feedback_checkpoint('feedback-day-10-v1')"))
      .rejects.toThrow("authentication_required");
    await db.close();
  });

  it("pins the catch-up and voluntariness contract in the migration", () => {
    expect(migration).toContain("campaign.checkpoint_day <= current_program_day");
    expect(migration).toContain("ORDER BY campaign.checkpoint_day ASC");
    expect(migration).toContain("terminal_state.state IN ('dismissed', 'started', 'submitted')");
    expect(migration).toContain("'reason', 'checkpoint_deferred'");
    expect(migration).toContain("interval '20 hours'");
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.defer_my_feedback_checkpoint(text)");
  });
});
