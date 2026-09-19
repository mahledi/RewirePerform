-- Read-only NLZ pilot integrity checks. No private text is selected.

-- 1. Program Runs and assigned instances
SELECT
  pr.id AS program_run_id,
  pr.team_id,
  pr.name,
  pr.status,
  pr.started_at,
  COUNT(DISTINCT pi.user_id) AS assigned_athletes
FROM public.program_runs pr
LEFT JOIN public.program_instances pi ON pi.program_run_id = pr.id
GROUP BY pr.id, pr.team_id, pr.name, pr.status, pr.started_at
ORDER BY pr.created_at DESC;

-- 2. More than one active run per team (must return zero rows)
SELECT team_id, COUNT(*) AS active_runs
FROM public.program_runs
WHERE status = 'active'
GROUP BY team_id
HAVING COUNT(*) > 1;

-- 3. More than one active instance per athlete (must return zero rows)
SELECT user_id, COUNT(*) AS active_instances
FROM public.program_instances
WHERE status = 'active'
GROUP BY user_id
HAVING COUNT(*) > 1;

-- 4. Run instance not matching run team/start (must return zero rows)
SELECT pi.id, pi.user_id, pi.team_id, pi.started_at, pr.team_id AS run_team_id, pr.started_at AS run_start
FROM public.program_instances pi
JOIN public.program_runs pr ON pr.id = pi.program_run_id
WHERE pi.team_id IS DISTINCT FROM pr.team_id
   OR pi.started_at IS DISTINCT FROM pr.started_at;

-- 5. Duplicate check-ins inside one instance/day (must return zero rows)
SELECT user_id, program_instance_id, date, COUNT(*) AS duplicates
FROM public.daily_checkins
WHERE program_instance_id IS NOT NULL
GROUP BY user_id, program_instance_id, date
HAVING COUNT(*) > 1;

-- 6. Completed day without matching check-in (must return zero rows for V2 flows)
SELECT udc.id, udc.user_id, udc.program_instance_id, uda.date, udc.day_number
FROM public.user_day_completion udc
JOIN public.user_day_assignments uda ON uda.id = udc.assignment_id
WHERE udc.completion_status = 'completed'
  AND udc.program_instance_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.daily_checkins dc
    WHERE dc.user_id = udc.user_id
      AND dc.program_instance_id = udc.program_instance_id
      AND dc.date = uda.date
  );

-- 7. Tracking rows missing an instance
SELECT 'daily_checkins' AS source, COUNT(*) AS missing FROM public.daily_checkins WHERE program_instance_id IS NULL
UNION ALL
SELECT 'daily_journals', COUNT(*) FROM public.daily_journals WHERE program_instance_id IS NULL
UNION ALL
SELECT 'user_day_completion', COUNT(*) FROM public.user_day_completion WHERE program_instance_id IS NULL
UNION ALL
SELECT 'comprehension', COUNT(*) FROM public.comprehension_check_instances WHERE program_instance_id IS NULL
UNION ALL
SELECT 'assessments', COUNT(*) FROM public.assessments WHERE program_instance_id IS NULL
UNION ALL
SELECT 'questionnaire_responses', COUNT(*) FROM public.questionnaire_responses WHERE program_instance_id IS NULL
UNION ALL
SELECT 'development_index', COUNT(*) FROM public.deep_profile_assessments WHERE program_instance_id IS NULL;

-- 8. Consent missingness by team (counts only)
SELECT
  tm.team_id,
  COUNT(*) FILTER (WHERE p.data_contribution_consent = true) AS consent_true,
  COUNT(*) FILTER (WHERE p.data_contribution_consent = false) AS consent_false,
  COUNT(*) FILTER (WHERE p.data_contribution_consent IS NULL) AS consent_null
FROM public.team_members tm
JOIN public.user_roles ur ON ur.user_id = tm.user_id AND ur.role = 'athlete'
JOIN public.profiles p ON p.id = tm.user_id
GROUP BY tm.team_id;

-- 9. Test users in non-test teams (must return zero rows)
SELECT tm.team_id, tm.user_id
FROM public.team_members tm
JOIN public.teams t ON t.id = tm.team_id
JOIN public.profiles p ON p.id = tm.user_id
WHERE COALESCE(t.is_test_team, false) = false
  AND COALESCE(p.is_test_user, false) = true;

-- 10. Run-scoped readiness for every active run (execute as Admin)
SELECT pr.id, public.get_nlz_pilot_readiness(pr.team_id, pr.id)
FROM public.program_runs pr
WHERE pr.status = 'active';
