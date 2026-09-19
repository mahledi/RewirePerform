// @vitest-environment node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("coach check-in reminder V1.4 contract", () => {
  const migration = read("supabase/migrations/20260901204924_coach_checkin_reminder_v1_4.sql");
  const edge = read("supabase/functions/send-coach-checkin-reminder/index.ts");
  const remotePush = read("supabase/functions/_shared/remotePush.ts");
  const overview = read("src/components/coach/TeamOverview.tsx");
  const nativeClient = read("src/lib/nativeRemotePush.ts");
  const privacy = read("src/pages/Privacy.tsx");

  it("separates today from the shared run-scoped seven-day check-in window", () => {
    expect(migration).toContain("get_coach_team_checkin_status_v1_4");
    expect(migration).toContain("today_checkin_completed boolean");
    expect(migration).toContain("rolling_7_completed integer");
    expect(migration).toContain("rolling_7_available integer");
    expect(migration).toContain("LEAST(7, LEAST(56, (effective_today - run_start) + 1))");
    expect(migration).toContain("checkin.program_instance_id = instance.program_instance_id");
    expect(migration).not.toContain("checkin.mood_before");
    expect(migration).not.toContain("checkin.focus_rating");
    expect(migration).not.toContain("checkin.reflection");
  });

  it("allows only one coach campaign per team day and rechecks completion before delivery", () => {
    expect(migration).toContain("UNIQUE (team_id, program_date)");
    expect(migration).toContain("ON CONFLICT (team_id, program_date) DO NOTHING");
    expect(migration).toContain("ON CONFLICT ON CONSTRAINT notification_log_user_id_notification_type_sent_date_key DO NOTHING");
    expect(migration).toContain("coach-checkin-reminder-retention-daily");
    expect(migration).toContain("interval '90 days'");
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.claim_coach_checkin_reminder_v1_4");
    expect(migration).toContain("TO service_role");
    expect(edge).toContain('.from("daily_checkins")');
    expect(edge).toContain('status: "skipped_completed"');
    expect(edge).not.toMatch(/mood_before|focus_rating|reflection|daily_journals/);
  });

  it("uses fixed friendly copy with the approved urgency and no arbitrary coach text", () => {
    expect(edge).toContain("Kurze Erinnerung von deinem Coach");
    expect(edge).toContain("Nimm dir bitte sobald wie möglich kurz Zeit dafür.");
    expect(edge).not.toContain("messageText");
    expect(edge).not.toContain("customMessage");
    expect(overview).toContain("Nimm dir bitte sobald wie möglich kurz Zeit dafür.");
  });

  it("keeps APNs, FCM, and Web Push as explicit independently configured adapters", () => {
    expect(remotePush).toContain("sendApnsPush");
    expect(remotePush).toContain("sendFcmPush");
    expect(remotePush).toContain("sendWebPush");
    expect(remotePush).toContain("FCM_SERVICE_ACCOUNT_JSON");
    expect(remotePush).toContain("firebase.messaging");
    expect(remotePush).toContain("rewireperform-reminders-v1");
    expect(edge).toContain("remotePushConfiguration()");
    expect(edge).toContain('device.platform === "ios" && configuration.apns');
    expect(edge).toContain('device.platform === "android" && configuration.fcm');
    expect(nativeClient).toContain('["ios", "android"]');
  });

  it("refreshes only check-in status in the background without clearing visible rows", () => {
    expect(overview).toContain("BACKGROUND_REFRESH_MS = 60_000");
    expect(overview).toContain("BACKGROUND_REQUEST_TIMEOUT_MS = 12_000");
    expect(overview).toContain(".abortSignal(controller.signal)");
    expect(overview).toContain("refreshCheckinStatus");
    expect(overview).toContain("activityRowsRef.current");
    expect(overview).toContain("Im Hintergrund aktualisieren");
    expect(overview).not.toContain("setActivityRows([])");
    expect(overview).not.toContain("Streak ");
    expect(overview).not.toContain(">inaktiv<");
  });

  it("updates the transparent voluntary push disclosure for Android and coach reminders", () => {
    expect(privacy).toContain("APNs- beziehungsweise FCM-Gerätetoken");
    expect(privacy).toContain("feste, freundliche Erinnerung");
    expect(privacy).toContain("offene Abschlussstatus");
  });

  it("executes the migration and derives one shared Day-1 denominator plus an atomic open-recipient claim", async () => {
    const db = new PGlite();
    const coach = "00000000-0000-4000-8000-000000000001";
    const athleteDone = "00000000-0000-4000-8000-000000000002";
    const athleteOpen = "00000000-0000-4000-8000-000000000003";
    const team = "00000000-0000-4000-8000-000000000004";
    const run = "00000000-0000-4000-8000-000000000005";
    const doneInstance = "00000000-0000-4000-8000-000000000006";
    const openInstance = "00000000-0000-4000-8000-000000000007";

    await db.exec(`
      CREATE ROLE anon;
      CREATE ROLE authenticated;
      CREATE ROLE service_role;
      CREATE SCHEMA auth;
      CREATE SCHEMA app_private;
      CREATE SCHEMA cron;
      CREATE FUNCTION cron.schedule(text, text, text) RETURNS bigint
        LANGUAGE sql AS $$ SELECT 1::bigint $$;
      CREATE TYPE public.app_role AS ENUM ('athlete', 'coach', 'admin');
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
        SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
      $$;
      CREATE TABLE auth.users (id uuid PRIMARY KEY);
      CREATE TABLE public.profiles (id uuid PRIMARY KEY, full_name text);
      CREATE TABLE public.teams (
        id uuid PRIMARY KEY,
        created_by uuid,
        is_test_team boolean NOT NULL DEFAULT false
      );
      CREATE TABLE public.user_roles (user_id uuid, role public.app_role);
      CREATE TABLE public.team_members (team_id uuid, user_id uuid);
      CREATE TABLE public.program_runs (
        id uuid PRIMARY KEY,
        team_id uuid REFERENCES public.teams(id),
        status text,
        started_at date,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb
      );
      CREATE TABLE public.program_instances (
        id uuid PRIMARY KEY,
        user_id uuid,
        program_run_id uuid,
        status text
      );
      CREATE TABLE public.qa_time_overrides (
        scope text,
        team_id uuid,
        simulated_date date,
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE public.team_calendar_events (
        team_id uuid,
        date date,
        training_timezone text,
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE public.team_training_schedule (
        team_id uuid,
        training_timezone text,
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE public.daily_checkins (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        program_instance_id uuid,
        date date,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE public.push_subscriptions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid,
        endpoint text,
        p256dh text,
        auth text
      );
      CREATE TABLE public.native_push_devices (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
        platform text NOT NULL DEFAULT 'ios' CHECK (platform = 'ios'),
        device_token text UNIQUE,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      ALTER TABLE public.native_push_devices ENABLE ROW LEVEL SECURITY;
      CREATE TABLE public.notification_log (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid,
        notification_type text NOT NULL CHECK (notification_type IN ('morning','pre_training','evening')),
        sent_date date NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        status text NOT NULL DEFAULT 'sent' CHECK (status IN ('pending','sent','opened','failed','expired_subscription')),
        scheduled_for timestamptz,
        sent_at timestamptz,
        opened_at timestamptz,
        failed_at timestamptz,
        error_code integer,
        target_url text,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        UNIQUE (user_id, notification_type, sent_date)
      );
      CREATE FUNCTION public.can_manage_team_program_runs(_team_id uuid)
      RETURNS boolean LANGUAGE sql STABLE AS $$
        SELECT EXISTS (
          SELECT 1 FROM public.teams
          WHERE id = _team_id AND created_by = auth.uid()
        )
      $$;
    `);
    await db.exec(migration);
    await db.exec(`
      INSERT INTO auth.users(id) VALUES ('${coach}'), ('${athleteDone}'), ('${athleteOpen}');
      INSERT INTO public.profiles(id, full_name) VALUES
        ('${athleteDone}', 'Done Athlete'), ('${athleteOpen}', 'Open Athlete');
      INSERT INTO public.teams(id, created_by, is_test_team) VALUES ('${team}', '${coach}', true);
      INSERT INTO public.user_roles(user_id, role) VALUES
        ('${coach}', 'coach'), ('${athleteDone}', 'athlete'), ('${athleteOpen}', 'athlete');
      INSERT INTO public.team_members(team_id, user_id) VALUES
        ('${team}', '${coach}'), ('${team}', '${athleteDone}'), ('${team}', '${athleteOpen}');
      INSERT INTO public.program_runs(id, team_id, status, started_at, timezone)
        VALUES ('${run}', '${team}', 'active', '2026-09-01', 'UTC');
      INSERT INTO public.qa_time_overrides(scope, team_id, simulated_date)
        VALUES ('team', '${team}', '2026-09-01');
      INSERT INTO public.program_instances(id, user_id, program_run_id, status) VALUES
        ('${doneInstance}', '${athleteDone}', '${run}', 'active'),
        ('${openInstance}', '${athleteOpen}', '${run}', 'active');
      INSERT INTO public.daily_checkins(program_instance_id, date)
        VALUES ('${doneInstance}', '2026-09-01');
      INSERT INTO public.native_push_devices(user_id, platform, device_token)
        VALUES ('${athleteOpen}', 'android', 'fcm-token-athlete-open');
      SELECT set_config('request.jwt.claim.sub', '${coach}', false);
    `);

    let status;
    try {
      status = await db.query<{
      full_name: string;
      today_checkin_completed: boolean;
      rolling_7_available: number;
      rolling_7_completed: number;
      supported_push_channels: string[];
    }>(`SELECT full_name, today_checkin_completed, rolling_7_available,
              rolling_7_completed, supported_push_channels
       FROM public.get_coach_team_checkin_status_v1_4($1)
       ORDER BY full_name`, [team]);
    } catch (error) {
      const postgres = error as Error & { detail?: string; where?: string };
      throw new Error(`status_rpc: ${postgres.message}; ${postgres.detail ?? ""}; ${postgres.where ?? ""}`);
    }

    expect(status.rows).toEqual([
      {
        full_name: "Done Athlete",
        today_checkin_completed: true,
        rolling_7_available: 1,
        rolling_7_completed: 1,
        supported_push_channels: [],
      },
      {
        full_name: "Open Athlete",
        today_checkin_completed: false,
        rolling_7_available: 1,
        rolling_7_completed: 0,
        supported_push_channels: ["fcm"],
      },
    ]);

    let claimed;
    try {
      claimed = await db.query<{ user_id: string; program_instance_id: string }>(
        `SELECT user_id, program_instance_id
         FROM public.claim_coach_checkin_reminder_v1_4($1, $2)`,
        [team, coach],
      );
    } catch (error) {
      const postgres = error as Error & { detail?: string; where?: string };
      throw new Error(`claim_rpc: ${postgres.message}; ${postgres.detail ?? ""}; ${postgres.where ?? ""}`);
    }
    expect(claimed.rows).toEqual([{ user_id: athleteOpen, program_instance_id: openInstance }]);
    await expect(db.query(
      `SELECT * FROM public.claim_coach_checkin_reminder_v1_4($1, $2)`,
      [team, coach],
    )).rejects.toThrow("reminder_already_requested");
  });
});
