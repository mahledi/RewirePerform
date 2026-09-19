// @vitest-environment node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const migration = read("supabase/migrations/20260829103000_admin_minor_age_correction_v1_3.sql");
const panel = read("src/components/admin/AdminMinorAgeCorrectionPanel.tsx");
const provider = read("src/contexts/MinorAuthorizationContext.tsx");

type CandidatePayload = {
  age_band: "under_16" | "age_16_17" | "adult" | null;
};

type CorrectionPayload = {
  success: boolean;
  changed: boolean;
  age_band: "under_16";
  age_assurance_method: string;
  product_status: string;
  guardian_status: string;
};

describe("V1.3 founder minor-age correction contract", () => {
  it("permits only an authenticated admin to inspect or correct an exact athlete account", () => {
    expect(migration.match(/ur\.role = 'admin'::public\.app_role/gu)).toHaveLength(2);
    expect(migration).toContain("lower(u.email) = normalized_email");
    expect(migration).toContain("ur.role = 'athlete'::public.app_role");
    expect(migration).toContain("explicit_confirmation_required");
    expect(migration).toContain("ALTERSGRUPPE_UNTER_16_BESTAETIGT");
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.admin_correct_athlete_to_under_16(uuid, text)");
    expect(migration).toContain("TO authenticated;");
  });

  it("supports both older self-declared bands and records the correction as support-verified", () => {
    expect(migration).toContain("participant.age_band NOT IN ('age_16_17', 'adult')");
    expect(migration).toContain("age_band = 'under_16'");
    expect(migration).toContain("age_assurance_method = 'support_verified_correction'");
    expect(migration).toContain("'age_band_corrected_to_under_16'");
    expect(migration).toContain("'support'");
  });

  it("fails closed until fresh Guardian and athlete authorization without deleting product data", () => {
    expect(migration).toContain("guardian_status = 'required'");
    expect(migration).toContain("athlete_status = 'required'");
    expect(migration).toContain("product_status = 'pending'");
    expect(migration).toContain("data_contribution_status = 'not_asked'");
    expect(migration).toContain("UPDATE minor_auth.guardian_challenges");
    expect(migration).toContain("UPDATE minor_auth.guardian_access_tokens");
    expect(migration).not.toMatch(/(?:UPDATE|DELETE FROM) public\.(?:questionnaire_responses|daily_checkins|daily_journals|assessments|program_instances|program_progress_snapshots|team_members|calendar_events)/u);
  });

  it("makes preservation and the irreversible operational effect explicit in the admin UI", () => {
    expect(panel).toContain('adult: "18+"');
    expect(panel).toContain('age_16_17: "16–17"');
    expect(panel).toContain("Fragebogen, Team, Fortschritt und alle bisherigen Einträge bleiben unverändert");
    expect(panel).toContain("Erst Elternfreigabe und Zustimmung des Athleten");
    expect(panel).toContain("find_admin_minor_age_candidate");
    expect(panel).toContain("admin_correct_athlete_to_under_16");
  });

  it("revalidates every athlete authorization when web or native app returns to foreground", () => {
    expect(provider).toContain('current.role !== "athlete"');
    expect(provider).toContain('authRef.current.role === "athlete"');
    expect(provider).toContain('recoverAccess("lifecycle")');
    expect(provider).not.toContain('currentStatus.state !== "guardian_pending"');
  });

  it("executes atomically against PostgreSQL and preserves the athlete product rows", async () => {
    const db = new PGlite();
    const adminId = "00000000-0000-4000-8000-000000000001";
    const athleteId = "00000000-0000-4000-8000-000000000002";
    const policyId = "00000000-0000-4000-8000-000000000003";

    await db.exec(`
      CREATE ROLE anon;
      CREATE ROLE authenticated;
      CREATE SCHEMA auth;
      CREATE SCHEMA minor_auth;
      CREATE TYPE public.app_role AS ENUM ('athlete', 'coach', 'admin');
      CREATE TABLE auth.users (id uuid PRIMARY KEY, email text);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
        SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
      $$;
      CREATE TABLE public.user_roles (user_id uuid, role public.app_role);
      CREATE TABLE public.profiles (
        id uuid PRIMARY KEY,
        full_name text,
        data_contribution_consent boolean,
        data_contribution_consent_version text,
        data_contribution_consented_at timestamptz,
        data_contribution_updated_at timestamptz
      );
      CREATE TABLE public.teams (id uuid PRIMARY KEY, name text, is_archived boolean DEFAULT false);
      CREATE TABLE public.team_members (team_id uuid, user_id uuid);
      CREATE TABLE public.questionnaire_responses (id uuid PRIMARY KEY, user_id uuid, answers jsonb);
      CREATE TABLE minor_auth.policy_versions (
        id uuid PRIMARY KEY,
        jurisdiction text,
        status text,
        effective_from timestamptz
      );
      CREATE TABLE minor_auth.participant_authorizations (
        user_id uuid PRIMARY KEY,
        policy_id uuid,
        jurisdiction text DEFAULT 'DE',
        age_band text,
        age_assurance_method text,
        guardian_status text,
        athlete_status text,
        product_status text,
        data_contribution_guardian boolean,
        data_contribution_athlete boolean,
        data_contribution_status text,
        guardian_authorized_at timestamptz,
        athlete_assented_at timestamptz,
        product_authorized_at timestamptz,
        revoked_at timestamptz,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
      CREATE TABLE minor_auth.guardian_challenges (
        id uuid PRIMARY KEY,
        user_id uuid,
        status text,
        consumed_at timestamptz
      );
      CREATE TABLE minor_auth.guardian_access_tokens (
        id uuid PRIMARY KEY,
        user_id uuid,
        revoked_at timestamptz
      );
      CREATE TABLE minor_auth.authorization_audit (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid,
        policy_id uuid,
        actor_type text,
        event_type text,
        resulting_product_status text,
        resulting_data_contribution_status text,
        receipt_id uuid DEFAULT gen_random_uuid(),
        created_at timestamptz DEFAULT now()
      );
    `);
    await db.exec(migration);
    await db.query(`SELECT set_config('request.jwt.claim.sub', $1, false)`, [adminId]);
    await db.exec(`
      INSERT INTO auth.users(id, email) VALUES ('${athleteId}', 'player@example.com');
      INSERT INTO public.user_roles(user_id, role) VALUES ('${adminId}', 'admin'), ('${athleteId}', 'athlete');
      INSERT INTO public.profiles(
        id, full_name, data_contribution_consent, data_contribution_consent_version,
        data_contribution_consented_at, data_contribution_updated_at
      ) VALUES ('${athleteId}', 'Pilot Spieler', true, 'v1', now(), now());
      INSERT INTO minor_auth.policy_versions(id, jurisdiction, status, effective_from)
        VALUES ('${policyId}', 'DE', 'active', now());
      INSERT INTO minor_auth.participant_authorizations(
        user_id, policy_id, age_band, age_assurance_method, guardian_status,
        athlete_status, product_status, data_contribution_athlete,
        data_contribution_status, product_authorized_at
      ) VALUES ('${athleteId}', '${policyId}', 'adult', 'age_band_self_declaration', 'not_required',
        'not_required', 'authorized', true, 'authorized', now());
      INSERT INTO public.questionnaire_responses(id, user_id, answers)
        VALUES ('00000000-0000-4000-8000-000000000004', '${athleteId}', '{"preserved":true}');
    `);

    const lookup = await db.query<{ candidate: CandidatePayload }>(
      `SELECT public.find_admin_minor_age_candidate($1) AS candidate`,
      ["PLAYER@example.com"],
    );
    expect(lookup.rows[0]?.candidate.age_band).toBe("adult");

    const corrected = await db.query<{ result: CorrectionPayload }>(
      `SELECT public.admin_correct_athlete_to_under_16($1, $2) AS result`,
      [athleteId, "ALTERSGRUPPE_UNTER_16_BESTAETIGT"],
    );
    expect(corrected.rows[0]?.result).toMatchObject({
      success: true,
      changed: true,
      age_band: "under_16",
      age_assurance_method: "support_verified_correction",
      product_status: "pending",
      guardian_status: "required",
    });

    const state = await db.query<{
      age_band: string;
      age_assurance_method: string;
      guardian_status: string;
      athlete_status: string;
      product_status: string;
      data_contribution_status: string;
      data_contribution_consent: boolean | null;
      answers: { preserved: boolean };
    }>(`
      SELECT pa.age_band, pa.age_assurance_method, pa.guardian_status,
        pa.athlete_status, pa.product_status, pa.data_contribution_status,
        p.data_contribution_consent, qr.answers
      FROM minor_auth.participant_authorizations pa
      JOIN public.profiles p ON p.id = pa.user_id
      JOIN public.questionnaire_responses qr ON qr.user_id = pa.user_id
      WHERE pa.user_id = $1
    `, [athleteId]);
    expect(state.rows[0]).toMatchObject({
      age_band: "under_16",
      age_assurance_method: "support_verified_correction",
      guardian_status: "required",
      athlete_status: "required",
      product_status: "pending",
      data_contribution_status: "not_asked",
      data_contribution_consent: null,
      answers: { preserved: true },
    });

    const audit = await db.query<{ actor_type: string; event_type: string }>(`
      SELECT actor_type, event_type
      FROM minor_auth.authorization_audit
      WHERE user_id = $1
    `, [athleteId]);
    expect(audit.rows).toEqual([{
      actor_type: "support",
      event_type: "age_band_corrected_to_under_16",
    }]);

    await db.close();
  });
});
