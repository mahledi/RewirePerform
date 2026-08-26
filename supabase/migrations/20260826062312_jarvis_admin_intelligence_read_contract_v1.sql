-- Jarvis Admin Intelligence: five fixed, production-only aggregate views.
-- Local candidate only. Applying this migration remains a separate Production gate.

BEGIN;

ALTER TABLE public.mahleos_operations_access_log
  DROP CONSTRAINT IF EXISTS mahleos_operations_access_log_view_name_check;

ALTER TABLE public.mahleos_operations_access_log
  ADD CONSTRAINT mahleos_operations_access_log_view_name_check CHECK (
    view_name IN (
      'daily_brief', 'system_health', 'tracking_quality', 'feedback_status',
      'pilot_readiness', 'pilot_catalog', 'solo_readiness', 'evidence_status',
      'admin_overview', 'admin_teams', 'admin_comprehension',
      'admin_feedback_metadata', 'admin_partner_requests'
    )
  );

CREATE OR REPLACE FUNCTION public._mahleos_admin_overview()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  WITH production_profiles AS MATERIALIZED (
    SELECT profile.id
    FROM public.profiles profile
    WHERE NOT COALESCE(profile.is_test_user, false)
  ), production_teams AS MATERIALIZED (
    SELECT team.id
    FROM public.teams team
    WHERE NOT COALESCE(team.is_test_team, false)
      AND NOT COALESCE(team.is_archived, false)
  )
  SELECT pg_catalog.jsonb_build_object(
    'schema_version', 'mahleos-admin-overview-v1',
    'generated_at', pg_catalog.now(),
    'reporting_timezone', 'UTC',
    'counts', pg_catalog.jsonb_build_object(
      'users', (SELECT COUNT(*)::integer FROM production_profiles),
      'athletes', (
        SELECT COUNT(DISTINCT role.user_id)::integer
        FROM public.user_roles role
        JOIN production_profiles profile ON profile.id = role.user_id
        WHERE role.role = 'athlete'::public.app_role
      ),
      'coaches', (
        SELECT COUNT(DISTINCT role.user_id)::integer
        FROM public.user_roles role
        JOIN production_profiles profile ON profile.id = role.user_id
        WHERE role.role = 'coach'::public.app_role
      ),
      'admins', (
        SELECT COUNT(DISTINCT role.user_id)::integer
        FROM public.user_roles role
        JOIN production_profiles profile ON profile.id = role.user_id
        WHERE role.role = 'admin'::public.app_role
      ),
      'teams', (SELECT COUNT(*)::integer FROM production_teams),
      'active_program_runs', (
        SELECT COUNT(*)::integer
        FROM public.program_runs run
        JOIN production_teams team ON team.id = run.team_id
        WHERE run.status = 'active'
      ),
      'active_program_instances', (
        SELECT COUNT(*)::integer
        FROM public.program_instances instance
        JOIN production_profiles profile ON profile.id = instance.user_id
        WHERE instance.status = 'active'
          AND NOT COALESCE(instance.is_test_instance, false)
      ),
      'completed_days_total', (
        SELECT COUNT(*)::integer
        FROM public.user_day_completion completion
        JOIN production_profiles profile ON profile.id = completion.user_id
        WHERE completion.completion_status = 'completed'
      ),
      'checkins_total', (
        SELECT COUNT(*)::integer
        FROM public.daily_checkins checkin
        JOIN production_profiles profile ON profile.id = checkin.user_id
      ),
      'assessments_total', (
        SELECT COUNT(*)::integer
        FROM public.assessments assessment
        JOIN production_profiles profile ON profile.id = assessment.user_id
      ),
      'comprehension_checks_completed', (
        SELECT COUNT(*)::integer
        FROM public.comprehension_check_instances check_instance
        JOIN production_profiles profile ON profile.id = check_instance.user_id
        WHERE check_instance.status = 'completed'
      )
    ),
    'test_data_included', false,
    'privacy_level', 'company_counts_only',
    'direct_identifiers_included', false,
    'private_content_included', false
  );
$$;

CREATE OR REPLACE FUNCTION public._mahleos_admin_teams()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  WITH production_teams AS MATERIALIZED (
    SELECT team.id, team.sport, team.program_start_date
    FROM public.teams team
    WHERE NOT COALESCE(team.is_test_team, false)
      AND NOT COALESCE(team.is_archived, false)
    ORDER BY team.created_at, team.id
    LIMIT 50
  ), athlete_members AS MATERIALIZED (
    SELECT member.team_id, member.user_id
    FROM public.team_members member
    JOIN production_teams team ON team.id = member.team_id
    JOIN public.user_roles role
      ON role.user_id = member.user_id
     AND role.role = 'athlete'::public.app_role
    JOIN public.profiles profile ON profile.id = member.user_id
    WHERE NOT COALESCE(profile.is_test_user, false)
  ), active_users_7d AS MATERIALIZED (
    SELECT member.team_id, member.user_id
    FROM athlete_members member
    JOIN public.daily_checkins checkin ON checkin.user_id = member.user_id
    WHERE checkin.date >= CURRENT_DATE - 6
    UNION
    SELECT member.team_id, member.user_id
    FROM athlete_members member
    JOIN public.user_day_completion completion ON completion.user_id = member.user_id
    WHERE completion.completion_status = 'completed'
      AND COALESCE(completion.completed_at, completion.created_at)
        >= pg_catalog.now() - interval '7 days'
  ), team_metrics AS (
    SELECT
      team.id,
      team.sport,
      team.program_start_date,
      (SELECT COUNT(*)::integer FROM athlete_members member WHERE member.team_id = team.id) AS athletes,
      (SELECT COUNT(*)::integer FROM active_users_7d active WHERE active.team_id = team.id) AS active_7d,
      (SELECT COUNT(*)::integer FROM public.daily_checkins checkin JOIN athlete_members member ON member.user_id = checkin.user_id AND member.team_id = team.id WHERE checkin.date >= CURRENT_DATE - 6) AS checkins_7d,
      (SELECT COUNT(*)::integer FROM public.user_day_completion completion JOIN athlete_members member ON member.user_id = completion.user_id AND member.team_id = team.id WHERE completion.completion_status = 'completed' AND COALESCE(completion.completed_at, completion.created_at) >= pg_catalog.now() - interval '7 days') AS completed_days_7d,
      (SELECT COUNT(DISTINCT assessment.user_id)::integer FROM public.assessments assessment JOIN athlete_members member ON member.user_id = assessment.user_id AND member.team_id = team.id WHERE assessment.timing = 'pre') AS pre_n,
      (SELECT COUNT(DISTINCT assessment.user_id)::integer FROM public.assessments assessment JOIN athlete_members member ON member.user_id = assessment.user_id AND member.team_id = team.id WHERE assessment.timing = 'mid') AS mid_n,
      (SELECT COUNT(DISTINCT assessment.user_id)::integer FROM public.assessments assessment JOIN athlete_members member ON member.user_id = assessment.user_id AND member.team_id = team.id WHERE assessment.timing = 'post') AS post_n,
      run.id AS run_id,
      run.status AS run_status,
      run.started_at AS run_started_at
    FROM production_teams team
    LEFT JOIN LATERAL (
      SELECT program_run.id, program_run.status, program_run.started_at
      FROM public.program_runs program_run
      WHERE program_run.team_id = team.id
        AND program_run.status IN ('active', 'planned')
      ORDER BY (program_run.status = 'active') DESC, program_run.created_at DESC
      LIMIT 1
    ) run ON true
  )
  SELECT pg_catalog.jsonb_build_object(
    'schema_version', 'mahleos-admin-teams-v1',
    'generated_at', pg_catalog.now(),
    'reporting_timezone', 'UTC',
    'returned_teams', COUNT(*)::integer,
    'truncated', (SELECT COUNT(*) FROM public.teams team WHERE NOT COALESCE(team.is_test_team, false) AND NOT COALESCE(team.is_archived, false)) > 50,
    'teams', COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'team_reference', 'aggregate-team-' || pg_catalog.substr(pg_catalog.encode(extensions.digest(pg_catalog.convert_to('jarvis-admin-team-v1:' || metric.id::text, 'UTF8'), 'sha256'), 'hex'), 1, 16),
      'sport_category', COALESCE(NULLIF(metric.sport, ''), 'unknown_or_other'),
      'program_start_date', metric.program_start_date,
      'athletes', metric.athletes,
      'active_7d', metric.active_7d,
      'inactive_7d', GREATEST(metric.athletes - metric.active_7d, 0),
      'checkins_7d', metric.checkins_7d,
      'completed_days_7d', metric.completed_days_7d,
      'pre_n', metric.pre_n,
      'mid_n', metric.mid_n,
      'post_n', metric.post_n,
      'run_reference', CASE WHEN metric.run_id IS NULL THEN NULL ELSE 'aggregate-run-' || pg_catalog.substr(pg_catalog.encode(extensions.digest(pg_catalog.convert_to('jarvis-admin-run-v1:' || metric.run_id::text, 'UTF8'), 'sha256'), 'hex'), 1, 16) END,
      'run_status', metric.run_status,
      'run_started_at', metric.run_started_at
    ) ORDER BY metric.program_start_date NULLS LAST, metric.id), '[]'::jsonb),
    'test_data_included', false,
    'team_names_included', false,
    'direct_identifiers_included', false,
    'private_content_included', false
  )
  FROM team_metrics metric;
$$;

CREATE OR REPLACE FUNCTION public._mahleos_admin_comprehension()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  WITH completed AS MATERIALIZED (
    SELECT check_instance.id AS check_id, check_instance.user_id,
      check_instance.day_number, check_instance.completed_at,
      check_instance.generated_questions, check_instance.results
    FROM public.comprehension_check_instances check_instance
    JOIN public.profiles profile ON profile.id = check_instance.user_id
    LEFT JOIN public.program_instances instance ON instance.id = check_instance.program_instance_id
    WHERE check_instance.status = 'completed'
      AND check_instance.completed_at IS NOT NULL
      AND NOT COALESCE(profile.is_test_user, false)
      AND NOT COALESCE(instance.is_test_instance, false)
  ), expanded AS MATERIALIZED (
    SELECT completed.check_id, completed.user_id, completed.day_number,
      ((completed.day_number - 1) / 7 + 1)::integer AS week_number,
      question.item ->> 'id' AS question_id,
      COALESCE(NULLIF(question.item ->> 'target', ''), 'unknown') AS target,
      pg_catalog.md5(COALESCE(question.item ->> 'id', '') || '|' || COALESCE(question.item ->> 'target', '') || '|' || COALESCE(question.item ->> 'stem', '')) AS question_version_key,
      lower(COALESCE(answer.item ->> 'isCorrect', 'false')) = 'true' AS is_correct
    FROM completed
    CROSS JOIN LATERAL pg_catalog.jsonb_array_elements(CASE WHEN pg_catalog.jsonb_typeof(completed.generated_questions) = 'array' THEN completed.generated_questions ELSE '[]'::jsonb END) question(item)
    LEFT JOIN LATERAL (
      SELECT result.item
      FROM pg_catalog.jsonb_array_elements(CASE WHEN pg_catalog.jsonb_typeof(completed.results) = 'array' THEN completed.results ELSE '[]'::jsonb END) result(item)
      WHERE result.item ->> 'questionId' = question.item ->> 'id'
      LIMIT 1
    ) answer ON true
    WHERE NULLIF(question.item ->> 'id', '') IS NOT NULL
      AND answer.item IS NOT NULL
      AND pg_catalog.jsonb_typeof(answer.item -> 'isCorrect') = 'boolean'
  ), summary AS (
    SELECT COUNT(DISTINCT user_id)::integer AS participants,
      COUNT(DISTINCT check_id)::integer AS completed_checks,
      COUNT(*)::integer AS question_responses,
      COUNT(*) FILTER (WHERE is_correct)::integer AS correct_responses
    FROM expanded
  ), week_groups AS (
    SELECT week_number, COUNT(DISTINCT user_id)::integer AS participants,
      COUNT(DISTINCT check_id)::integer AS completed_checks,
      COUNT(*)::integer AS responses,
      COUNT(*) FILTER (WHERE is_correct)::integer AS correct
    FROM expanded GROUP BY week_number
  ), day_groups AS (
    SELECT day_number, week_number, COUNT(DISTINCT user_id)::integer AS participants,
      COUNT(DISTINCT check_id)::integer AS completed_checks,
      COUNT(*)::integer AS responses,
      COUNT(*) FILTER (WHERE is_correct)::integer AS correct
    FROM expanded GROUP BY day_number, week_number
  ), question_groups AS (
    SELECT day_number, week_number, question_id, question_version_key, target,
      COUNT(DISTINCT user_id)::integer AS participants,
      COUNT(*)::integer AS times_shown,
      COUNT(*) FILTER (WHERE is_correct)::integer AS correct
    FROM expanded
    GROUP BY day_number, week_number, question_id, question_version_key, target
  )
  SELECT pg_catalog.jsonb_build_object(
    'schema_version', 'mahleos-admin-comprehension-v1',
    'generated_at', pg_catalog.now(),
    'reporting_timezone', 'UTC',
    'summary', pg_catalog.jsonb_build_object(
      'participants', summary.participants,
      'completed_checks', CASE WHEN summary.participants >= 5 THEN summary.completed_checks END,
      'question_responses', CASE WHEN summary.participants >= 5 THEN summary.question_responses END,
      'correct_responses', CASE WHEN summary.participants >= 5 THEN summary.correct_responses END,
      'incorrect_responses', CASE WHEN summary.participants >= 5 THEN summary.question_responses - summary.correct_responses END,
      'accuracy', CASE WHEN summary.participants >= 5 AND summary.question_responses > 0 THEN pg_catalog.round(summary.correct_responses::numeric / summary.question_responses, 4) END,
      'sufficient_data', summary.participants >= 5
    ),
    'weeks', COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'week_number', group_row.week_number, 'participants', group_row.participants,
      'completed_checks', group_row.completed_checks, 'question_responses', group_row.responses,
      'correct_responses', group_row.correct, 'incorrect_responses', group_row.responses - group_row.correct,
      'accuracy', CASE WHEN group_row.responses > 0 THEN pg_catalog.round(group_row.correct::numeric / group_row.responses, 4) END
    ) ORDER BY group_row.week_number) FROM week_groups group_row WHERE group_row.participants >= 5), '[]'::jsonb),
    'days', COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'day_number', group_row.day_number, 'week_number', group_row.week_number,
      'participants', group_row.participants, 'completed_checks', group_row.completed_checks,
      'question_responses', group_row.responses, 'correct_responses', group_row.correct,
      'incorrect_responses', group_row.responses - group_row.correct,
      'accuracy', CASE WHEN group_row.responses > 0 THEN pg_catalog.round(group_row.correct::numeric / group_row.responses, 4) END
    ) ORDER BY group_row.day_number) FROM day_groups group_row WHERE group_row.participants >= 5), '[]'::jsonb),
    'questions', COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'day_number', group_row.day_number, 'week_number', group_row.week_number,
      'question_id', group_row.question_id, 'question_version_key', group_row.question_version_key,
      'target', group_row.target, 'participants', group_row.participants,
      'times_shown', group_row.times_shown, 'correct_responses', group_row.correct,
      'incorrect_responses', group_row.times_shown - group_row.correct,
      'accuracy', CASE WHEN group_row.times_shown > 0 THEN pg_catalog.round(group_row.correct::numeric / group_row.times_shown, 4) END,
      'needs_content_review', group_row.times_shown > 0 AND group_row.correct::numeric / group_row.times_shown < 0.7
    ) ORDER BY group_row.day_number, group_row.question_id) FROM question_groups group_row WHERE group_row.participants >= 5), '[]'::jsonb),
    'suppressed_groups', pg_catalog.jsonb_build_object(
      'weeks', (SELECT COUNT(*)::integer FROM week_groups group_row WHERE group_row.participants < 5),
      'days', (SELECT COUNT(*)::integer FROM day_groups group_row WHERE group_row.participants < 5),
      'questions', (SELECT COUNT(*)::integer FROM question_groups group_row WHERE group_row.participants < 5)
    ),
    'minimum_distinct_participants', 5,
    'question_text_included', false,
    'selected_options_included', false,
    'direct_identifiers_included', false,
    'private_content_included', false,
    'test_data_included', false
  ) FROM summary;
$$;

CREATE OR REPLACE FUNCTION public._mahleos_admin_feedback_metadata()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  WITH production_feedback AS MATERIALIZED (
    SELECT
      CASE WHEN feedback.type IN ('bug', 'suggestion', 'general') THEN feedback.type ELSE 'other' END AS category,
      CASE WHEN feedback.status IN ('open', 'reviewed', 'resolved') THEN feedback.status ELSE 'other' END AS review_status,
      feedback.created_at,
      COALESCE(feedback.technical_context ->> 'runtime', 'unknown') AS runtime,
      COALESCE(feedback.technical_context ->> 'platform', 'unknown') AS platform,
      COALESCE(feedback.technical_context ->> 'app_version', 'unknown') AS app_version
    FROM public.feedback feedback
    JOIN public.profiles profile ON profile.id = feedback.user_id
    WHERE NOT COALESCE(profile.is_test_user, false)
  )
  SELECT pg_catalog.jsonb_build_object(
    'schema_version', 'mahleos-admin-feedback-metadata-v1',
    'generated_at', pg_catalog.now(),
    'reporting_timezone', 'UTC',
    'counts', pg_catalog.jsonb_build_object(
      'total', COUNT(*)::integer,
      'open', COUNT(*) FILTER (WHERE review_status = 'open')::integer,
      'reviewed', COUNT(*) FILTER (WHERE review_status = 'reviewed')::integer,
      'resolved', COUNT(*) FILTER (WHERE review_status = 'resolved')::integer,
      'new_24h', COUNT(*) FILTER (WHERE created_at >= pg_catalog.now() - interval '24 hours')::integer,
      'new_7d', COUNT(*) FILTER (WHERE created_at >= pg_catalog.now() - interval '7 days')::integer
    ),
    'open_by_category', pg_catalog.jsonb_build_object(
      'bug', COUNT(*) FILTER (WHERE review_status = 'open' AND category = 'bug')::integer,
      'suggestion', COUNT(*) FILTER (WHERE review_status = 'open' AND category = 'suggestion')::integer,
      'general', COUNT(*) FILTER (WHERE review_status = 'open' AND category = 'general')::integer,
      'other', COUNT(*) FILTER (WHERE review_status = 'open' AND category = 'other')::integer
    ),
    'by_platform', COALESCE((SELECT pg_catalog.jsonb_object_agg(group_row.platform, group_row.count) FROM (SELECT platform, COUNT(*)::integer AS count FROM production_feedback GROUP BY platform) group_row), '{}'::jsonb),
    'by_runtime', COALESCE((SELECT pg_catalog.jsonb_object_agg(group_row.runtime, group_row.count) FROM (SELECT runtime, COUNT(*)::integer AS count FROM production_feedback GROUP BY runtime) group_row), '{}'::jsonb),
    'by_app_version', COALESCE((SELECT pg_catalog.jsonb_object_agg(group_row.app_version, group_row.count) FROM (SELECT app_version, COUNT(*)::integer AS count FROM production_feedback GROUP BY app_version) group_row), '{}'::jsonb),
    'test_data_included', false,
    'free_text_included', false,
    'admin_notes_included', false,
    'direct_identifiers_included', false
  ) FROM production_feedback;
$$;

CREATE OR REPLACE FUNCTION public._mahleos_admin_partner_requests()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  WITH requests AS MATERIALIZED (
    SELECT request.status, request.organization_type, request.rollout_scope,
      request.desired_start, request.submitted_at
    FROM public.organization_access_requests request
  )
  SELECT pg_catalog.jsonb_build_object(
    'schema_version', 'mahleos-admin-partner-requests-v1',
    'generated_at', pg_catalog.now(),
    'reporting_timezone', 'UTC',
    'counts', pg_catalog.jsonb_build_object(
      'total', COUNT(*)::integer,
      'submitted', COUNT(*) FILTER (WHERE status = 'submitted')::integer,
      'needs_information', COUNT(*) FILTER (WHERE status = 'needs_information')::integer,
      'review_ready', COUNT(*) FILTER (WHERE status = 'review_ready')::integer,
      'call_requested', COUNT(*) FILTER (WHERE status = 'call_requested')::integer,
      'approved', COUNT(*) FILTER (WHERE status IN ('approved_community', 'approved_partner', 'approved_enterprise'))::integer,
      'activated', COUNT(*) FILTER (WHERE status = 'activated')::integer,
      'declined_or_withdrawn', COUNT(*) FILTER (WHERE status IN ('declined', 'withdrawn'))::integer,
      'open_older_than_7d', COUNT(*) FILTER (WHERE status IN ('submitted', 'needs_information', 'review_ready', 'call_requested') AND submitted_at < pg_catalog.now() - interval '7 days')::integer
    ),
    'by_organization_type', COALESCE((SELECT pg_catalog.jsonb_object_agg(group_row.organization_type, group_row.count) FROM (SELECT organization_type, COUNT(*)::integer AS count FROM requests GROUP BY organization_type) group_row), '{}'::jsonb),
    'by_rollout_scope', COALESCE((SELECT pg_catalog.jsonb_object_agg(group_row.rollout_scope, group_row.count) FROM (SELECT rollout_scope, COUNT(*)::integer AS count FROM requests GROUP BY rollout_scope) group_row), '{}'::jsonb),
    'by_desired_start', COALESCE((SELECT pg_catalog.jsonb_object_agg(group_row.desired_start, group_row.count) FROM (SELECT desired_start, COUNT(*)::integer AS count FROM requests GROUP BY desired_start) group_row), '{}'::jsonb),
    'contact_details_included', false,
    'organization_names_included', false,
    'notes_or_context_included', false,
    'direct_identifiers_included', false
  ) FROM requests;
$$;

REVOKE ALL ON FUNCTION public._mahleos_admin_overview()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public._mahleos_admin_teams()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public._mahleos_admin_comprehension()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public._mahleos_admin_feedback_metadata()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public._mahleos_admin_partner_requests()
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.read_mahleos_operational_view(
  _request_id uuid,
  _client_id text,
  _view_name text DEFAULT 'daily_brief',
  _program_run_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  payload jsonb;
  response_checksum text;
  recent_requests integer := 0;
  audit_program_run_id uuid;
BEGIN
  IF _request_id IS NULL
     OR _client_id IS NULL
     OR _client_id !~ '^[a-z0-9][a-z0-9_-]{2,63}$'
     OR _view_name NOT IN (
       'daily_brief', 'system_health', 'tracking_quality', 'feedback_status',
       'pilot_readiness', 'pilot_catalog', 'solo_readiness', 'evidence_status',
       'admin_overview', 'admin_teams', 'admin_comprehension',
       'admin_feedback_metadata', 'admin_partner_requests'
     )
     OR (_view_name = 'pilot_readiness' AND _program_run_id IS NULL)
     OR (_view_name <> 'pilot_readiness' AND _program_run_id IS NOT NULL) THEN
    IF _request_id IS NOT NULL
       AND _client_id ~ '^[a-z0-9][a-z0-9_-]{2,63}$'
       AND _view_name IN (
         'daily_brief', 'system_health', 'tracking_quality', 'feedback_status',
         'pilot_readiness', 'pilot_catalog', 'solo_readiness', 'evidence_status',
         'admin_overview', 'admin_teams', 'admin_comprehension',
         'admin_feedback_metadata', 'admin_partner_requests'
       ) THEN
      INSERT INTO public.mahleos_operations_access_log(
        request_id, client_id, view_name, program_run_id, outcome
      ) VALUES (
        _request_id, _client_id, _view_name, NULL, 'invalid_request'
      ) ON CONFLICT (request_id) DO NOTHING;
    END IF;
    RETURN pg_catalog.jsonb_build_object('ok', false, 'error', 'invalid_request');
  END IF;

  IF _program_run_id IS NOT NULL THEN
    SELECT run.id INTO audit_program_run_id
    FROM public.program_runs run
    WHERE run.id = _program_run_id
    FOR KEY SHARE;
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(_client_id, 0));

  IF EXISTS (SELECT 1 FROM public.mahleos_operations_access_log log WHERE log.request_id = _request_id) THEN
    RETURN pg_catalog.jsonb_build_object('ok', false, 'error', 'invalid_request');
  END IF;

  SELECT COUNT(*)::integer INTO recent_requests
  FROM public.mahleos_operations_access_log log
  WHERE log.client_id = _client_id
    AND log.requested_at >= pg_catalog.now() - interval '1 minute';

  IF recent_requests >= 30 THEN
    INSERT INTO public.mahleos_operations_access_log(
      request_id, client_id, view_name, program_run_id, outcome
    ) VALUES (
      _request_id, _client_id, _view_name, audit_program_run_id, 'rate_limited'
    ) ON CONFLICT (request_id) DO NOTHING;
    RETURN pg_catalog.jsonb_build_object('ok', false, 'error', 'rate_limited');
  END IF;

  payload := CASE _view_name
    WHEN 'daily_brief' THEN pg_catalog.jsonb_build_object(
      'schema_version', 'mahleos-daily-brief-v1',
      'generated_at', pg_catalog.now(),
      'reporting_timezone', 'UTC',
      'system_health', public._mahleos_system_health(),
      'tracking_quality', public._mahleos_tracking_quality(),
      'feedback_status', public._mahleos_feedback_status(),
      'claim_boundary', 'operational monitoring only; no effectiveness or causal conclusion'
    )
    WHEN 'system_health' THEN public._mahleos_system_health()
    WHEN 'tracking_quality' THEN public._mahleos_tracking_quality()
    WHEN 'feedback_status' THEN public._mahleos_feedback_status()
    WHEN 'pilot_readiness' THEN public._mahleos_pilot_readiness(_program_run_id)
    WHEN 'pilot_catalog' THEN public._mahleos_pilot_catalog()
    WHEN 'solo_readiness' THEN public._mahleos_solo_readiness()
    WHEN 'evidence_status' THEN public._mahleos_evidence_status()
    WHEN 'admin_overview' THEN public._mahleos_admin_overview()
    WHEN 'admin_teams' THEN public._mahleos_admin_teams()
    WHEN 'admin_comprehension' THEN public._mahleos_admin_comprehension()
    WHEN 'admin_feedback_metadata' THEN public._mahleos_admin_feedback_metadata()
    WHEN 'admin_partner_requests' THEN public._mahleos_admin_partner_requests()
  END;

  IF payload IS NULL THEN
    INSERT INTO public.mahleos_operations_access_log(
      request_id, client_id, view_name, program_run_id, outcome
    ) VALUES (
      _request_id, _client_id, _view_name, audit_program_run_id, 'not_found'
    ) ON CONFLICT (request_id) DO NOTHING;
    RETURN pg_catalog.jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  response_checksum := pg_catalog.encode(
    extensions.digest(pg_catalog.convert_to(payload::text, 'UTF8'), 'sha256'),
    'hex'
  );

  INSERT INTO public.mahleos_operations_access_log(
    request_id, client_id, view_name, program_run_id, outcome, response_checksum
  ) VALUES (
    _request_id, _client_id, _view_name, audit_program_run_id, 'served', response_checksum
  ) ON CONFLICT (request_id) DO NOTHING;

  RETURN pg_catalog.jsonb_build_object(
    'ok', true,
    'request_id', _request_id,
    'view', _view_name,
    'checksum_algorithm', 'sha256',
    'response_checksum', response_checksum,
    'data', payload
  );
END;
$$;

REVOKE ALL ON FUNCTION public.read_mahleos_operational_view(uuid, text, text, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.read_mahleos_operational_view(uuid, text, text, uuid)
  TO service_role;

COMMENT ON FUNCTION public._mahleos_admin_overview() IS
  'Production-only company and product counts for Jarvis; no direct identifiers or private content.';
COMMENT ON FUNCTION public._mahleos_admin_teams() IS
  'Production-only team operations with opaque references; no team names, person identities or private content.';
COMMENT ON FUNCTION public._mahleos_admin_comprehension() IS
  'Production-only structured comprehension aggregates; every metric-bearing group requires n >= 5.';
COMMENT ON FUNCTION public._mahleos_admin_feedback_metadata() IS
  'Production-only fixed feedback metadata aggregates; no message, note or direct identifier leaves the database.';
COMMENT ON FUNCTION public._mahleos_admin_partner_requests() IS
  'Production-only business inquiry aggregates; no contact, organization name, note or direct identifier.';

COMMIT;
