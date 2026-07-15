import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();

const ids = {
  admin: "00000000-0000-4000-8000-000000000001",
  coach: "00000000-0000-4000-8000-000000000002",
  athlete: "00000000-0000-4000-8000-000000000003",
  minor: "00000000-0000-4000-8000-000000000004",
  intruder: "00000000-0000-4000-8000-000000000005",
  team: "10000000-0000-4000-8000-000000000001",
  run: "20000000-0000-4000-8000-000000000001",
  instance: "30000000-0000-4000-8000-000000000001",
  minorInstance: "30000000-0000-4000-8000-000000000002",
  assignment: "40000000-0000-4000-8000-000000000001",
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const lateAthletes = [
  {
    user: "00000000-0000-4000-8000-000000000006",
    instance: "30000000-0000-4000-8000-000000000003",
  },
  {
    user: "00000000-0000-4000-8000-000000000007",
    instance: "30000000-0000-4000-8000-000000000004",
  },
  {
    user: "00000000-0000-4000-8000-000000000008",
    instance: "30000000-0000-4000-8000-000000000005",
  },
  {
    user: "00000000-0000-4000-8000-000000000009",
    instance: "30000000-0000-4000-8000-000000000006",
  },
];

try {
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE AS $$
      SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    GRANT USAGE ON SCHEMA auth TO anon, authenticated;
    GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;

    CREATE TYPE public.app_role AS ENUM ('athlete', 'coach', 'admin');
    CREATE TABLE public.profiles(
      id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      full_name text,
      sport text,
      is_test_user boolean NOT NULL DEFAULT false,
      data_contribution_consent boolean,
      data_contribution_consent_version text,
      data_contribution_consented_at timestamptz
    );
    CREATE TABLE public.user_roles(
      user_id uuid NOT NULL REFERENCES auth.users(id),
      role public.app_role NOT NULL,
      UNIQUE(user_id, role)
    );
    CREATE TABLE public.teams(
      id uuid PRIMARY KEY,
      name text NOT NULL,
      created_by uuid REFERENCES auth.users(id)
    );
    CREATE TABLE public.team_members(
      team_id uuid NOT NULL REFERENCES public.teams(id),
      user_id uuid NOT NULL REFERENCES auth.users(id),
      PRIMARY KEY (team_id, user_id)
    );
    CREATE TABLE public.program_runs(
      id uuid PRIMARY KEY,
      team_id uuid NOT NULL REFERENCES public.teams(id),
      name text NOT NULL,
      status text NOT NULL,
      started_at date,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE public.program_instances(
      id uuid PRIMARY KEY,
      user_id uuid NOT NULL REFERENCES auth.users(id),
      team_id uuid REFERENCES public.teams(id),
      program_run_id uuid REFERENCES public.program_runs(id),
      status text NOT NULL,
      started_at date NOT NULL,
      ended_at date,
      is_test_instance boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE public.user_day_assignments(
      id uuid PRIMARY KEY,
      user_id uuid NOT NULL REFERENCES auth.users(id),
      date date NOT NULL,
      assigned_day_number integer NOT NULL,
      context_type text NOT NULL DEFAULT 'training',
      status text NOT NULL DEFAULT 'active'
    );
    CREATE TABLE public.synthetic_daily_tracking_writes(
      assignment_id uuid PRIMARY KEY,
      save_count integer NOT NULL DEFAULT 1
    );

    CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
    RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
      SELECT EXISTS(
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = _user_id AND ur.role = _role
      )
    $$;

    CREATE FUNCTION public.can_manage_team_program_runs(_team_id uuid)
    RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
      SELECT auth.uid() IS NOT NULL AND (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR EXISTS (
          SELECT 1 FROM public.teams t
          WHERE t.id = _team_id AND t.created_by = auth.uid()
        )
        OR EXISTS (
          SELECT 1
          FROM public.team_members tm
          JOIN public.user_roles ur
            ON ur.user_id = tm.user_id AND ur.role = 'coach'::public.app_role
          WHERE tm.team_id = _team_id AND tm.user_id = auth.uid()
        )
      )
    $$;

    CREATE FUNCTION public.save_daily_tracking_v2(
      _assignment_id uuid,
      _date date,
      _event_type text,
      _day_number integer,
      _variant_used text,
      _program_instance_id uuid,
      _tasks_completed jsonb DEFAULT '[]'::jsonb,
      _reflection text DEFAULT NULL,
      _mood_before integer DEFAULT NULL,
      _energy_level integer DEFAULT NULL,
      _focus_rating integer DEFAULT NULL,
      _stress integer DEFAULT NULL,
      _recovery integer DEFAULT NULL,
      _sleep_quality integer DEFAULT NULL,
      _physical_readiness integer DEFAULT NULL,
      _motivation integer DEFAULT NULL,
      _pressure integer DEFAULT NULL,
      _team_connection integer DEFAULT NULL,
      _comprehension_questions jsonb DEFAULT NULL,
      _comprehension_results jsonb DEFAULT NULL
    ) RETURNS json LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = pg_catalog AS $$
    BEGIN
      INSERT INTO public.synthetic_daily_tracking_writes(assignment_id)
      VALUES (_assignment_id)
      ON CONFLICT (assignment_id) DO UPDATE
      SET save_count = public.synthetic_daily_tracking_writes.save_count + 1;

      RETURN json_build_object(
        'checkin_id', gen_random_uuid(),
        'completion_id', gen_random_uuid(),
        'program_instance_id', _program_instance_id,
        'date', _date,
        'day_number', _day_number
      );
    END;
    $$;
  `);

  const migrationFiles = [
    "20260714224000_performance_evidence_56d_v1.sql",
    "20260715085749_performance_evidence_fk_indexes.sql",
  ];
  for (const migrationFile of migrationFiles) {
    const migration = readFileSync(
      resolve(process.cwd(), "supabase/migrations", migrationFile),
      "utf8",
    );
    await db.exec(migration);
  }

  await db.exec(`
    INSERT INTO auth.users(id) VALUES
      ('${ids.admin}'), ('${ids.coach}'), ('${ids.athlete}'), ('${ids.minor}'), ('${ids.intruder}');
    INSERT INTO public.profiles(
      id, full_name, sport, data_contribution_consent,
      data_contribution_consent_version, data_contribution_consented_at
    ) VALUES
      ('${ids.admin}', 'Admin', NULL, true, 'data_contribution_v2_2026_07', now()),
      ('${ids.coach}', 'Coach', 'Fussball', true, 'data_contribution_v2_2026_07', now()),
      ('${ids.athlete}', 'Athlet A', 'Fussball', true, 'data_contribution_v2_2026_07', now()),
      ('${ids.minor}', 'Jugend A', 'Fussball', true, 'data_contribution_v2_2026_07', now()),
      ('${ids.intruder}', 'Fremder Coach', 'Fussball', true, 'data_contribution_v2_2026_07', now());
    INSERT INTO public.user_roles(user_id, role) VALUES
      ('${ids.admin}', 'admin'), ('${ids.coach}', 'coach'),
      ('${ids.athlete}', 'athlete'), ('${ids.minor}', 'athlete'), ('${ids.intruder}', 'coach');
    INSERT INTO public.teams(id, name, created_by) VALUES ('${ids.team}', 'Pilot Team', '${ids.coach}');
    INSERT INTO public.team_members(team_id, user_id) VALUES ('${ids.team}', '${ids.coach}');
    INSERT INTO public.program_runs(id, team_id, name, status, started_at)
      VALUES ('${ids.run}', '${ids.team}', 'Pilot Run', 'active', CURRENT_DATE - 14);
    INSERT INTO public.program_instances(
      id, user_id, team_id, program_run_id, status, started_at
    ) VALUES ('${ids.instance}', '${ids.athlete}', '${ids.team}', '${ids.run}', 'active', CURRENT_DATE - 14);
    INSERT INTO public.user_day_assignments(id, user_id, date, assigned_day_number, context_type)
      VALUES ('${ids.assignment}', '${ids.athlete}', CURRENT_DATE, 4, 'training');
  `);

  const asUser = async (userId) => {
    await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [userId]);
  };

  await asUser(ids.admin);
  await db.query("SELECT public.set_evidence_adult_eligibility($1, true)", [ids.instance]);

  await asUser(ids.athlete);
  let directTableAccessDenied = false;
  let authenticatedRpcAllowed = false;
  await db.exec("SET ROLE authenticated");
  try {
    try {
      await db.query("SELECT count(*) FROM public.athlete_transfer_observations");
    } catch (error) {
      directTableAccessDenied = String(error).toLowerCase().includes("permission denied");
    }
    const roleStatus = await db.query(
      "SELECT public.get_my_evidence_status($1, '56d-transfer-v1-2026-07', 4, 'training') AS value",
      [ids.instance],
    );
    authenticatedRpcAllowed = roleStatus.rows[0].value.eligible === true;
  } finally {
    await db.exec("RESET ROLE");
  }
  assert(directTableAccessDenied, "authenticated role must not read evidence tables directly");
  assert(authenticatedRpcAllowed, "authenticated owner must reach the narrow RPC surface");

  let anonRpcDenied = false;
  await db.exec("SET ROLE anon");
  try {
    try {
      await db.query(
        "SELECT public.get_my_evidence_status($1, '56d-transfer-v1-2026-07', 4, 'training')",
        [ids.instance],
      );
    } catch (error) {
      anonRpcDenied = String(error).toLowerCase().includes("permission denied");
    }
  } finally {
    await db.exec("RESET ROLE");
  }
  assert(anonRpcDenied, "anon role must not execute evidence RPCs");

  const status = await db.query(
    "SELECT public.get_my_evidence_status($1, '56d-transfer-v1-2026-07', 4, 'training') AS value",
    [ids.instance],
  );
  assert(status.rows[0].value.eligible === true, "adult evidence status should be eligible");

  const saveEvidence = (response) => db.query(`
    SELECT public.save_daily_tracking_v3(
      _assignment_id => $1,
      _date => CURRENT_DATE,
      _event_type => 'training',
      _day_number => 4,
      _variant_used => 'training',
      _program_instance_id => $2,
      _tasks_completed => '[]'::jsonb,
      _reflection => NULL,
      _mood_before => 7,
      _energy_level => 7,
      _focus_rating => 7,
      _evidence_protocol_version => '56d-transfer-v1-2026-07',
      _evidence_domain_id => 'attention_return',
      _evidence_response => $3,
      _evidence_response_duration_ms => 8000
    ) AS value
  `, [ids.assignment, ids.instance, response]);

  await saveEvidence("3");
  await saveEvidence("3");
  const observationCount = await db.query(
    "SELECT count(*)::int AS n FROM public.athlete_transfer_observations",
  );
  assert(observationCount.rows[0].n === 1, "evidence save must be idempotent");
  const baseWritesBeforeFailure = await db.query(
    "SELECT save_count FROM public.synthetic_daily_tracking_writes WHERE assignment_id = $1",
    [ids.assignment],
  );
  assert(baseWritesBeforeFailure.rows[0].save_count === 2, "base tracking stub should record both idempotent calls");

  let lockedMismatchRejected = false;
  try {
    await saveEvidence("4");
  } catch (error) {
    lockedMismatchRejected = String(error).includes("evidence_observation_already_locked");
  }
  assert(lockedMismatchRejected, "locked evidence mismatch should fail");
  const baseWritesAfterFailure = await db.query(
    "SELECT save_count FROM public.synthetic_daily_tracking_writes WHERE assignment_id = $1",
    [ids.assignment],
  );
  assert(
    baseWritesAfterFailure.rows[0].save_count === 2,
    "late evidence failure must roll back the base daily tracking write",
  );

  await asUser(ids.intruder);
  let unauthorizedCoachDenied = false;
  try {
    await db.query("SELECT public.get_coach_evidence_review_context($1) AS value", [ids.team]);
  } catch (error) {
    unauthorizedCoachDenied = String(error).includes("coach_team_access_required");
  }
  assert(unauthorizedCoachDenied, "coach outside the team must not access review context");

  await asUser(ids.coach);
  const coachContext = await db.query(
    "SELECT public.get_coach_evidence_review_context($1) AS value",
    [ids.team],
  );
  assert(coachContext.rows[0].value.team_eligible === true, "eligible team review should open");
  assert(coachContext.rows[0].value.week_number === 3, "review week should be deterministic");

  const observations = JSON.stringify({
    attention_return: 3,
    error_recovery: 3,
    pressure_regulation: 2,
    process_execution: 4,
    action_under_uncertainty: "not_observed",
  });
  await db.query(`
    SELECT public.save_coach_evidence_review(
      'team', $1, NULL, '56d-transfer-v1-2026-07', 3, 'training', $2::jsonb, 45000
    )
  `, [ids.team, observations]);
  await db.query(`
    SELECT public.save_coach_evidence_review(
      'athlete', $1, $2, '56d-transfer-v1-2026-07', 3, 'training', $3::jsonb, 30000
    )
  `, [ids.team, ids.instance, observations]);

  const reviewCounts = await db.query(`
    SELECT
      (SELECT count(*)::int FROM public.coach_evidence_reviews) AS reviews,
      (SELECT count(*)::int FROM public.coach_evidence_observations) AS observations,
      (SELECT completion_duration_ms FROM public.coach_evidence_reviews WHERE scope_type = 'team') AS team_duration_ms,
      (SELECT completion_duration_ms FROM public.coach_evidence_reviews WHERE scope_type = 'athlete') AS athlete_duration_ms
  `);
  assert(
    reviewCounts.rows[0].reviews === 2 && reviewCounts.rows[0].observations === 10,
    "coach review must save exactly five domains per scope",
  );
  assert(
    reviewCounts.rows[0].team_duration_ms === 45000
      && reviewCounts.rows[0].athlete_duration_ms === 30000,
    "coach review duration must be stored without adding user input",
  );

  for (const [index, lateAthlete] of lateAthletes.entries()) {
    await db.query("INSERT INTO auth.users(id) VALUES ($1)", [lateAthlete.user]);
    await db.query(`
      INSERT INTO public.profiles(
        id, full_name, sport, data_contribution_consent,
        data_contribution_consent_version, data_contribution_consented_at
      ) VALUES ($1, $2, 'Fussball', true, 'data_contribution_v2_2026_07', now())
    `, [lateAthlete.user, `Spaeter A${index + 2}`]);
    await db.query("INSERT INTO public.user_roles(user_id, role) VALUES ($1, 'athlete')", [lateAthlete.user]);
    await db.query(`
      INSERT INTO public.program_instances(
        id, user_id, team_id, program_run_id, status, started_at
      ) VALUES ($1, $2, $3, $4, 'active', CURRENT_DATE - 14)
    `, [lateAthlete.instance, lateAthlete.user, ids.team, ids.run]);
  }

  await asUser(ids.admin);
  for (const lateAthlete of lateAthletes) {
    await db.query("SELECT public.set_evidence_adult_eligibility($1, true)", [lateAthlete.instance]);
  }
  await db.exec(`
    INSERT INTO public.program_instances(
      id, user_id, team_id, program_run_id, status, started_at
    ) VALUES ('${ids.minorInstance}', '${ids.minor}', '${ids.team}', '${ids.run}', 'active', CURRENT_DATE);
    INSERT INTO public.evidence_participation_eligibility(
      program_instance_id,
      status,
      verification_basis,
      guardian_consent_version,
      athlete_assent_version,
      verified_by,
      verified_at
    ) VALUES (
      '${ids.minorInstance}',
      'minor_guardian_assent_verified',
      'guardian_consent_and_athlete_assent_confirmed',
      'guardian-draft',
      'assent-draft',
      '${ids.admin}',
      now()
    );
  `);
  const summary = await db.query(
    "SELECT public.get_performance_evidence_summary($1, false) AS value",
    [ids.run],
  );
  const summaryValue = summary.rows[0].value;
  assert(summaryValue.sample.participants_with_observation === 1, "summary sample mismatch");
  assert(
    summaryValue.sample.scope_participants_total === 6
      && summaryValue.sample.eligible_participants === 5
      && summaryValue.sample.excluded_participants === 1
      && summaryValue.sample.exclusion_reasons.minor_participation_not_enabled === 1,
    "minor exclusion must remain visible in aggregate sample quality without including minor data",
  );
  assert(summaryValue.domain_aggregates[0].average_score === null, "n<5 must suppress athlete aggregate");
  assert(
    summaryValue.domain_aggregates[0].average_response_duration_ms === null
      && summaryValue.domain_aggregates[0].duration_sufficient_data === false,
    "n<5 must suppress passive duration aggregate",
  );
  assert(
    summaryValue.data_quality.individual_coach_reviews_excluded === 1,
    "individual coach review must be excluded",
  );
  assert(
    summaryValue.coach_team_observations[0].average_score === null
      && summaryValue.coach_team_observations[0].sufficient_data === false
      && summaryValue.coach_team_observations[0].observed_athlete_n === 1
      && summaryValue.coach_team_observations[0].currently_eligible_athlete_n === 5,
    "later team growth must not reveal a review originally observed at n<5",
  );
  assert(
    !JSON.stringify(summaryValue).includes(ids.athlete)
      && !JSON.stringify(summaryValue).includes("Athlet A"),
    "aggregate export must not contain athlete identifiers",
  );

  for (const [index, lateAthlete] of lateAthletes.entries()) {
    const assignmentId = `40000000-0000-4000-8000-00000000000${index + 2}`;
    await db.query(`
      INSERT INTO public.user_day_assignments(id, user_id, date, assigned_day_number, context_type)
      VALUES ($1, $2, CURRENT_DATE, 4, 'training')
    `, [assignmentId, lateAthlete.user]);
    await db.query(`
      INSERT INTO public.athlete_transfer_observations(
        user_id, program_instance_id, program_run_id, team_id, assignment_id,
        protocol_version, day_number, domain_id, event_type, score, not_observed,
        response_duration_ms, consent_version, consented_at, is_test
      ) VALUES (
        $1, $2, $3, $4, $5,
        '56d-transfer-v1-2026-07', 4, 'attention_return', 'training', $6, false, $7,
        'data_contribution_v2_2026_07', now(), false
      )
    `, [lateAthlete.user, lateAthlete.instance, ids.run, ids.team, assignmentId, index + 1, 9000 + index * 1000]);
  }

  await db.query(`
    INSERT INTO public.user_day_assignments(id, user_id, date, assigned_day_number, context_type)
    VALUES
      ('40000000-0000-4000-8000-000000000010', $1, CURRENT_DATE, 7, 'training'),
      ('40000000-0000-4000-8000-000000000011', $2, CURRENT_DATE, 11, 'rest')
  `, [lateAthletes[0].user, lateAthletes[1].user]);

  const summaryAtFive = await db.query(
    "SELECT public.get_performance_evidence_summary($1, false) AS value",
    [ids.run],
  );
  const attentionAtFive = summaryAtFive.rows[0].value.domain_aggregates.find(
    (row) => row.domain_id === "attention_return",
  );
  assert(
    attentionAtFive.n === 5
      && attentionAtFive.sufficient_data === true
      && attentionAtFive.average_score !== null
      && attentionAtFive.timed_n === 5
      && attentionAtFive.average_response_duration_ms !== null
      && attentionAtFive.duration_sufficient_data === true,
    "athlete aggregate should become visible exactly at n=5",
  );
  assert(
    summaryAtFive.rows[0].value.coverage.expected_transfer_observations === 6
      && summaryAtFive.rows[0].value.coverage.collected_transfer_observations === 5
      && summaryAtFive.rows[0].value.coverage.missing_transfer_observations === 1
      && summaryAtFive.rows[0].value.coverage.transfer_completion_rate === 0.8333
      && summaryAtFive.rows[0].value.coverage.rest_day_pulses_skipped === 1,
    "coverage must separate collected, missing, and structurally skipped rest-day pulses",
  );
  assert(
    summaryAtFive.rows[0].value.coach_team_observations[0].average_score === null,
    "athlete n=5 must not unlock a coach review observed at n=1",
  );

  const minorReason = await db.query(
    "SELECT public.evidence_eligibility_reason($1, '56d-transfer-v1-2026-07') AS reason",
    [ids.minorInstance],
  );
  assert(minorReason.rows[0].reason === "minor_participation_not_enabled", "minor path must remain disabled");

  const ageColumns = await db.query(`
    SELECT count(*)::int AS n
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name LIKE 'evidence%'
      AND column_name IN ('age', 'date_of_birth', 'birthdate')
  `);
  assert(ageColumns.rows[0].n === 0, "evidence schema must not store age or birthdate");

  const evidenceFkIndexes = await db.query(`
    SELECT count(*)::int AS n
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname IN (
        'idx_athlete_transfer_observations_assignment',
        'idx_athlete_transfer_observations_protocol',
        'idx_athlete_transfer_observations_team',
        'idx_coach_evidence_reviews_protocol',
        'idx_coach_evidence_reviews_target_instance',
        'idx_coach_evidence_reviews_team',
        'idx_evidence_eligibility_audit_actor',
        'idx_evidence_participation_verified_by',
        'idx_evidence_participation_revoked_by'
      )
  `);
  assert(evidenceFkIndexes.rows[0].n === 9, "all evidence foreign-key indexes must exist");

  console.log(JSON.stringify({
    migrationApplied: true,
    adultStatusEligible: true,
    athleteObservationIdempotent: true,
    lateEvidenceFailureRolledBackBaseSave: true,
    lockedMismatchRejected,
    coachReviewRows: reviewCounts.rows[0],
    belowFiveSuppressed: true,
    athleteAggregateAtFiveVisible: true,
    durationAggregateAtFiveVisible: true,
    coverageSeparatesMissingAndRest: true,
    excludedMinorVisibleWithoutMinorData: true,
    coachTeamBelowFiveSuppressed: true,
    individualCoachReviewExcluded: true,
    directTableAccessDenied,
    authenticatedRpcAllowed,
    anonRpcDenied,
    unauthorizedCoachDenied,
    minorPathDisabled: true,
    ageColumns: ageColumns.rows[0].n,
    evidenceForeignKeyIndexes: evidenceFkIndexes.rows[0].n,
  }, null, 2));
} finally {
  await db.close();
}
