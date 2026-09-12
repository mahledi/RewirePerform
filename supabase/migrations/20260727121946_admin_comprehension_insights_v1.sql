-- Admin-only product comprehension insights.
-- Production migration version: 20260727121946.
-- Uses structured multiple-choice checks; never returns journal or reflection text,
-- selected options, user identifiers, names, or email addresses.

CREATE OR REPLACE FUNCTION public.get_admin_comprehension_insights(
  _include_test boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  actor_id uuid := auth.uid();
  payload jsonb;
BEGIN
  IF actor_id IS NULL
     OR NOT public.has_role(actor_id, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'admin_role_required';
  END IF;

  WITH completed AS MATERIALIZED (
    SELECT
      cci.id AS check_id,
      cci.user_id,
      cci.day_number,
      cci.completed_at,
      cci.generated_questions,
      cci.results
    FROM public.comprehension_check_instances cci
    JOIN public.profiles p
      ON p.id = cci.user_id
    LEFT JOIN public.program_instances pi
      ON pi.id = cci.program_instance_id
    WHERE cci.status = 'completed'
      AND cci.completed_at IS NOT NULL
      AND (
        _include_test
        OR (
          NOT COALESCE(p.is_test_user, false)
          AND NOT COALESCE(pi.is_test_instance, false)
        )
      )
  ), expanded AS MATERIALIZED (
    SELECT
      c.check_id,
      c.user_id,
      c.day_number,
      ((c.day_number - 1) / 7 + 1)::integer AS week_number,
      c.completed_at,
      question.item ->> 'id' AS question_id,
      COALESCE(NULLIF(question.item ->> 'target', ''), 'unknown') AS target,
      COALESCE(NULLIF(question.item ->> 'stem', ''), 'Frage ohne Text') AS stem,
      pg_catalog.md5(
        COALESCE(question.item ->> 'id', '')
        || '|'
        || COALESCE(question.item ->> 'target', '')
        || '|'
        || COALESCE(question.item ->> 'stem', '')
      ) AS question_version_key,
      lower(COALESCE(answer.item ->> 'isCorrect', 'false')) = 'true' AS is_correct
    FROM completed c
    CROSS JOIN LATERAL pg_catalog.jsonb_array_elements(
      CASE
        WHEN pg_catalog.jsonb_typeof(c.generated_questions) = 'array'
          THEN c.generated_questions
        ELSE '[]'::jsonb
      END
    ) AS question(item)
    LEFT JOIN LATERAL (
      SELECT result.item
      FROM pg_catalog.jsonb_array_elements(
        CASE
          WHEN pg_catalog.jsonb_typeof(c.results) = 'array'
            THEN c.results
          ELSE '[]'::jsonb
        END
      ) AS result(item)
      WHERE result.item ->> 'questionId' = question.item ->> 'id'
      LIMIT 1
    ) AS answer ON true
    WHERE NULLIF(question.item ->> 'id', '') IS NOT NULL
      AND answer.item IS NOT NULL
      AND pg_catalog.jsonb_typeof(answer.item -> 'isCorrect') = 'boolean'
  ), summary AS (
    SELECT
      COUNT(DISTINCT user_id)::integer AS participants,
      COUNT(DISTINCT check_id)::integer AS completed_checks,
      COUNT(*)::integer AS question_responses,
      COUNT(*) FILTER (WHERE is_correct)::integer AS correct_responses
    FROM expanded
  ), by_week AS (
    SELECT
      week_number,
      COUNT(DISTINCT user_id)::integer AS participants,
      COUNT(DISTINCT check_id)::integer AS completed_checks,
      COUNT(*)::integer AS question_responses,
      COUNT(*) FILTER (WHERE is_correct)::integer AS correct_responses
    FROM expanded
    GROUP BY week_number
  ), by_day AS (
    SELECT
      day_number,
      ((day_number - 1) / 7 + 1)::integer AS week_number,
      COUNT(DISTINCT user_id)::integer AS participants,
      COUNT(DISTINCT check_id)::integer AS completed_checks,
      COUNT(*)::integer AS question_responses,
      COUNT(*) FILTER (WHERE is_correct)::integer AS correct_responses
    FROM expanded
    GROUP BY day_number
  ), by_question AS (
    SELECT
      day_number,
      ((day_number - 1) / 7 + 1)::integer AS week_number,
      question_id,
      question_version_key,
      target,
      stem,
      COUNT(DISTINCT user_id)::integer AS participants,
      COUNT(*)::integer AS times_shown,
      COUNT(*) FILTER (WHERE is_correct)::integer AS correct_responses,
      MIN(completed_at) AS first_seen_at,
      MAX(completed_at) AS last_seen_at
    FROM expanded
    GROUP BY
      day_number,
      question_id,
      question_version_key,
      target,
      stem
  )
  SELECT pg_catalog.jsonb_build_object(
    'schema_version', 'admin-comprehension-insights-v1',
    'generated_at', pg_catalog.now(),
    'include_test', _include_test,
    'summary', pg_catalog.jsonb_build_object(
      'participants', s.participants,
      'completed_checks', s.completed_checks,
      'question_responses', s.question_responses,
      'correct_responses', CASE WHEN s.participants >= 5 THEN s.correct_responses END,
      'incorrect_responses', CASE
        WHEN s.participants >= 5 THEN s.question_responses - s.correct_responses
      END,
      'accuracy', CASE
        WHEN s.participants >= 5 AND s.question_responses > 0
          THEN pg_catalog.round(s.correct_responses::numeric / s.question_responses, 4)
      END,
      'sufficient_data', s.participants >= 5
    ),
    'weeks', COALESCE((
      SELECT pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'week_number', w.week_number,
          'participants', w.participants,
          'completed_checks', w.completed_checks,
          'question_responses', w.question_responses,
          'correct_responses', CASE WHEN w.participants >= 5 THEN w.correct_responses END,
          'incorrect_responses', CASE
            WHEN w.participants >= 5 THEN w.question_responses - w.correct_responses
          END,
          'accuracy', CASE
            WHEN w.participants >= 5 AND w.question_responses > 0
              THEN pg_catalog.round(w.correct_responses::numeric / w.question_responses, 4)
          END,
          'sufficient_data', w.participants >= 5
        )
        ORDER BY w.week_number
      )
      FROM by_week w
    ), '[]'::jsonb),
    'days', COALESCE((
      SELECT pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'day_number', d.day_number,
          'week_number', d.week_number,
          'participants', d.participants,
          'completed_checks', d.completed_checks,
          'question_responses', d.question_responses,
          'correct_responses', CASE WHEN d.participants >= 5 THEN d.correct_responses END,
          'incorrect_responses', CASE
            WHEN d.participants >= 5 THEN d.question_responses - d.correct_responses
          END,
          'accuracy', CASE
            WHEN d.participants >= 5 AND d.question_responses > 0
              THEN pg_catalog.round(d.correct_responses::numeric / d.question_responses, 4)
          END,
          'sufficient_data', d.participants >= 5
        )
        ORDER BY d.day_number
      )
      FROM by_day d
    ), '[]'::jsonb),
    'questions', COALESCE((
      SELECT pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'day_number', q.day_number,
          'week_number', q.week_number,
          'question_id', q.question_id,
          'question_version_key', q.question_version_key,
          'target', q.target,
          'stem', q.stem,
          'participants', q.participants,
          'times_shown', q.times_shown,
          'correct_responses', CASE WHEN q.participants >= 5 THEN q.correct_responses END,
          'incorrect_responses', CASE
            WHEN q.participants >= 5 THEN q.times_shown - q.correct_responses
          END,
          'accuracy', CASE
            WHEN q.participants >= 5 AND q.times_shown > 0
              THEN pg_catalog.round(q.correct_responses::numeric / q.times_shown, 4)
          END,
          'needs_content_review', CASE
            WHEN q.participants >= 5 AND q.times_shown > 0
              THEN q.correct_responses::numeric / q.times_shown < 0.7
            ELSE false
          END,
          'first_seen_at', q.first_seen_at,
          'last_seen_at', q.last_seen_at,
          'sufficient_data', q.participants >= 5
        )
        ORDER BY
          CASE
            WHEN q.participants >= 5 AND q.times_shown > 0
              THEN q.correct_responses::numeric / q.times_shown
          END ASC NULLS LAST,
          q.day_number,
          q.question_id
      )
      FROM by_question q
    ), '[]'::jsonb),
    'privacy', pg_catalog.jsonb_build_object(
      'minimum_participants_for_scores', 5,
      'journal_or_reflection_text_included', false,
      'selected_options_included', false,
      'user_identifiers_included', false,
      'names_or_emails_included', false,
      'test_data_included', _include_test
    )
  )
  INTO payload
  FROM summary s;

  RETURN payload;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_comprehension_insights(boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_comprehension_insights(boolean)
  TO authenticated;

COMMENT ON FUNCTION public.get_admin_comprehension_insights(boolean) IS
  'Admin-only aggregate product-comprehension insights. Scores are suppressed below five distinct participants; no private text, selected options, or participant identifiers are returned.';
