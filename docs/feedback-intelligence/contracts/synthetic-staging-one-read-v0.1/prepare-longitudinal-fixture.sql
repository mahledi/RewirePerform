-- Temporary, fully synthetic DE Staging fixture for one Feedback Intelligence read.
-- Creates 15 anonymous test subjects across days 10, 24, 39 and 55.
-- Includes all 55 structured questions, activity-count snapshots and 20 clearly
-- labelled voluntary synthetic comments. No names, email addresses, team data,
-- coach data, journal text or reflection text are inserted.

BEGIN;

CREATE TEMP TABLE feedback_one_shot_subjects (
  subject_index integer PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  program_instance_id uuid NOT NULL UNIQUE,
  age_band text NOT NULL
) ON COMMIT DROP;

INSERT INTO feedback_one_shot_subjects(subject_index, user_id, program_instance_id, age_band)
SELECT
  subject_index,
  ('88080800-0000-4000-8000-' || lpad(subject_index::text, 12, '0'))::uuid,
  ('88080810-0000-4000-8000-' || lpad(subject_index::text, 12, '0'))::uuid,
  CASE
    WHEN subject_index <= 5 THEN 'under_16'
    WHEN subject_index <= 10 THEN 'age_16_17'
    ELSE 'adult'
  END
FROM generate_series(1, 15) AS subject_index;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM auth.users existing
    INNER JOIN feedback_one_shot_subjects fixture ON fixture.user_id = existing.id
  ) OR EXISTS (
    SELECT 1 FROM public.program_instances existing
    INNER JOIN feedback_one_shot_subjects fixture
      ON fixture.program_instance_id = existing.id
  ) THEN
    RAISE EXCEPTION 'feedback_one_shot_fixture_identity_collision';
  END IF;

  IF (SELECT count(*) FROM feedback_core.campaigns WHERE status = 'draft') <> 4
     OR (SELECT count(*) FROM feedback_core.question_definitions) <> 55 THEN
    RAISE EXCEPTION 'feedback_one_shot_fixture_registry_drift';
  END IF;
END;
$$;

INSERT INTO auth.users(id)
SELECT user_id FROM feedback_one_shot_subjects;

INSERT INTO public.profiles(id, is_test_user)
SELECT user_id, true FROM feedback_one_shot_subjects
ON CONFLICT (id) DO UPDATE SET is_test_user = true;

INSERT INTO public.program_instances(
  id, user_id, status, started_at, is_test_instance
)
SELECT program_instance_id, user_id, 'completed', current_date - 54, true
FROM feedback_one_shot_subjects;

INSERT INTO feedback_core.subject_links(user_id, program_instance_id)
SELECT user_id, program_instance_id
FROM feedback_one_shot_subjects;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'feedback_consent'
      AND table_name = 'guardian_text_authorizations'
      AND column_name = 'guardian_notice_hash'
  ) THEN
    EXECUTE $insert_current$
      INSERT INTO feedback_consent.guardian_text_authorizations(
        user_id, scope, consent_version, notice_hash, guardian_notice_hash,
        state, granted_at, policy_reference
      )
      SELECT
        fixture.user_id,
        policy.scope,
        policy.consent_version,
        policy.athlete_notice_hash,
        policy.guardian_notice_hash,
        'granted',
        clock_timestamp(),
        policy.policy_reference
      FROM feedback_one_shot_subjects fixture
      CROSS JOIN LATERAL (
        SELECT scope, consent_version, athlete_notice_hash,
               guardian_notice_hash, policy_reference
        FROM feedback_consent.guardian_text_policy_versions
        WHERE jurisdiction = 'DE'
        ORDER BY CASE status WHEN 'active' THEN 0 ELSE 1 END, created_at DESC
        LIMIT 1
      ) policy
      WHERE fixture.age_band = 'under_16'
    $insert_current$;
  ELSE
    INSERT INTO feedback_consent.guardian_text_authorizations(
      user_id, scope, consent_version, notice_hash, state, granted_at,
      policy_reference
    )
    SELECT
      fixture.user_id,
      campaign.text_consent_scope,
      campaign.text_consent_version,
      campaign.text_notice_hash,
      'granted',
      clock_timestamp(),
      'synthetic-one-shot-guardian-v1'
    FROM feedback_one_shot_subjects fixture
    CROSS JOIN LATERAL (
      SELECT text_consent_scope, text_consent_version, text_notice_hash
      FROM feedback_core.campaigns
      ORDER BY checkpoint_day
      LIMIT 1
    ) campaign
    WHERE fixture.age_band = 'under_16';
  END IF;
END;
$$;

INSERT INTO feedback_core.submissions(
  client_submission_id, campaign_id, user_id, subject_reference,
  program_instance_id, questionnaire_version, language, product_version,
  content_version, program_day, jurisdiction_at_submit, age_band_at_submit,
  product_authorization_basis, status
)
SELECT
  gen_random_uuid(),
  campaign.id,
  fixture.user_id,
  subject.subject_reference,
  fixture.program_instance_id,
  campaign.questionnaire_version,
  campaign.language,
  '1.1.0+9999',
  campaign.content_version,
  campaign.checkpoint_day,
  'DE',
  fixture.age_band,
  CASE fixture.age_band
    WHEN 'under_16' THEN 'guardian_and_athlete_authorized'
    WHEN 'age_16_17' THEN 'athlete_authorized'
    ELSE 'adult_or_not_required'
  END,
  'draft'
FROM feedback_one_shot_subjects fixture
INNER JOIN feedback_core.subject_links subject
  ON subject.user_id = fixture.user_id
  AND subject.program_instance_id = fixture.program_instance_id
CROSS JOIN feedback_core.campaigns campaign;

INSERT INTO feedback_consent.text_consent_receipts(
  submission_id, user_id, state, scope, consent_version, notice_hash,
  guardian_authorization_reference, granted_at
)
SELECT
  submission.id,
  submission.user_id,
  CASE WHEN fixture.subject_index <= 11 THEN 'granted' ELSE 'declined' END,
  campaign.text_consent_scope,
  campaign.text_consent_version,
  campaign.text_notice_hash,
  CASE
    WHEN fixture.age_band = 'under_16' AND fixture.subject_index <= 11
      THEN guardian.consent_reference
    ELSE NULL
  END,
  CASE WHEN fixture.subject_index <= 11 THEN clock_timestamp() ELSE NULL END
FROM feedback_core.submissions submission
INNER JOIN feedback_one_shot_subjects fixture ON fixture.user_id = submission.user_id
INNER JOIN feedback_core.campaigns campaign ON campaign.id = submission.campaign_id
LEFT JOIN feedback_consent.guardian_text_authorizations guardian
  ON guardian.user_id = submission.user_id
  AND guardian.scope = campaign.text_consent_scope;

INSERT INTO feedback_core.structured_answers(
  submission_id, question_definition_id, selected_option_ids
)
SELECT
  submission.id,
  question.id,
  jsonb_build_array(
    CASE
      WHEN question.option_ids[1] = '1'
       AND cardinality(question.option_ids) >= 5
        THEN CASE
          WHEN fixture.subject_index <= 5 THEN question.option_ids[5]
          WHEN fixture.subject_index <= 10 THEN question.option_ids[3]
          ELSE question.option_ids[1]
        END
      ELSE question.option_ids[1]
    END
  )
FROM feedback_core.submissions submission
INNER JOIN feedback_one_shot_subjects fixture ON fixture.user_id = submission.user_id
INNER JOIN feedback_core.question_definitions question
  ON question.campaign_id = submission.campaign_id;

INSERT INTO feedback_core.activity_snapshots(
  submission_id, observation_end_program_day, program_days_available,
  program_days_completed, checkins_completed, journal_entries_created_count,
  tasks_completed, transfer_pulse_count, resume_delay_bucket,
  continuation_status_bucket
)
SELECT
  submission.id,
  submission.program_day,
  submission.program_day,
  CASE
    WHEN fixture.subject_index <= 5 THEN greatest(1, floor(submission.program_day * 0.90))::integer
    WHEN fixture.subject_index <= 10 THEN greatest(1, floor(submission.program_day * 0.60))::integer
    ELSE greatest(1, floor(submission.program_day * 0.30))::integer
  END,
  CASE
    WHEN fixture.subject_index <= 5 THEN floor(submission.program_day * 0.85)::integer
    WHEN fixture.subject_index <= 10 THEN floor(submission.program_day * 0.55)::integer
    ELSE floor(submission.program_day * 0.25)::integer
  END,
  CASE
    WHEN fixture.subject_index <= 5 THEN floor(submission.program_day * 0.65)::integer
    WHEN fixture.subject_index <= 10 THEN floor(submission.program_day * 0.35)::integer
    ELSE floor(submission.program_day * 0.10)::integer
  END,
  CASE
    WHEN fixture.subject_index <= 5 THEN floor(submission.program_day * 1.80)::integer
    WHEN fixture.subject_index <= 10 THEN floor(submission.program_day * 1.05)::integer
    ELSE floor(submission.program_day * 0.45)::integer
  END,
  NULL,
  CASE
    WHEN fixture.subject_index <= 5 THEN 'NO_RESUME_NEEDED'
    WHEN fixture.subject_index <= 10 THEN 'DAYS_1_3'
    ELSE 'DAYS_4_7'
  END,
  CASE
    WHEN fixture.subject_index <= 5 THEN 'ACTIVE_OR_COMPLETED'
    WHEN fixture.subject_index <= 10 THEN 'PAUSED_1_3_DAYS'
    ELSE 'PAUSED_4_7_DAYS'
  END
FROM feedback_core.submissions submission
INNER JOIN feedback_one_shot_subjects fixture ON fixture.user_id = submission.user_id;

CREATE TEMP TABLE feedback_one_shot_comments (
  subject_index integer NOT NULL,
  program_day integer NOT NULL,
  question_id text NOT NULL,
  raw_text text NOT NULL,
  PRIMARY KEY (subject_index, program_day)
) ON COMMIT DROP;

INSERT INTO feedback_one_shot_comments(subject_index, program_day, question_id, raw_text)
VALUES
  (1, 10, 'd10_content_clarity', '[SYNTHETISCH] Ich habe den Ablauf verstanden. An Trainingstagen war mir die Erklärung trotzdem etwas zu lang.'),
  (2, 10, 'd10_rest_visualization_guidance_clarity', '[SYNTHETISCH] Die Sportsituation war gut vorstellbar, aber der Wechsel von der Atmung in die Szene kam für mich zu plötzlich.'),
  (6, 10, 'd10_text_load', '[SYNTHETISCH] Die Textmenge war meistens passend. Bei der Aufgabe hätte ich gern früher ein kurzes Beispiel gesehen.'),
  (7, 10, 'd10_daily_fit', '[SYNTHETISCH] Der kurze Ablauf passt gut vor dem Training. Nach späten Einheiten schiebe ich ihn eher auf.'),
  (11, 10, 'd10_program_affinity', '[SYNTHETISCH] Das Programm wirkt klar und professionell, aber ich musste die erste Aufgabe zweimal lesen.'),
  (1, 24, 'd24_rest_visualization_guidance_clarity', '[SYNTHETISCH] Meinen Satz in der Sportsituation zu nutzen war nach dem zweiten Versuch klar.'),
  (2, 24, 'd24_training_transfer', '[SYNTHETISCH] Ich habe die kurze Pause vor der nächsten Handlung schon zweimal im Training ausprobiert.'),
  (6, 24, 'd24_text_load', '[SYNTHETISCH] Ich bekomme genug Informationen, einzelne Erklärungen wiederholen sich für mich aber etwas.'),
  (7, 24, 'd24_improvement_priority', '[SYNTHETISCH] Auf dem ersten Bildschirm sollte noch schneller sichtbar sein, was ich heute konkret tun soll.'),
  (11, 24, 'd24_self_learning', '[SYNTHETISCH] Ich merke inzwischen schneller, wann ich nach einem Fehler sofort bewerte statt sachlich zu bleiben.'),
  (1, 39, 'd39_rest_visualization_self_direction', '[SYNTHETISCH] Den heutigen Satz kann ich inzwischen selbstständig zurückholen und in der Szene nutzen.'),
  (2, 39, 'd39_training_transfer', '[SYNTHETISCH] Im ruhigen Training klappt der Transfer. Unter starkem Druck vergesse ich ihn noch häufig.'),
  (6, 39, 'd39_retrieval_access', '[SYNTHETISCH] Durch die regelmäßigen Check-ins fällt mir der passende nächste Gedanke schneller ein.'),
  (7, 39, 'd39_main_barrier', '[SYNTHETISCH] Nach sehr späten Einheiten fehlt mir manchmal die Energie, noch aufmerksam weiterzumachen.'),
  (11, 39, 'd39_self_learning', '[SYNTHETISCH] Ich erkenne meine Muster besser, brauche danach aber weiterhin einen sehr konkreten nächsten Schritt.'),
  (1, 55, 'd55_rest_visualization_integration', '[SYNTHETISCH] Die mentalen Einheiten haben meine Sätze gut mit konkreten Sportsituationen verbunden.'),
  (2, 55, 'd55_training_transfer', '[SYNTHETISCH] Nach Fehlern nutze ich das Gelernte öfter, automatisch passiert es aber noch nicht immer.'),
  (6, 55, 'd55_free_recall_level', '[SYNTHETISCH] Ohne nachzusehen fallen mir zwei Sätze und eine konkrete nächste Handlung ein.'),
  (7, 55, 'd55_change_priority', '[SYNTHETISCH] Ich würde manche Einleitungen kürzen und das Ende einer Aufgabe noch eindeutiger machen.'),
  (11, 55, 'd55_overall_helpfulness', '[SYNTHETISCH] Insgesamt war das Programm hilfreich, weil die Schritte einfach waren. Einige Texte könnten kürzer sein.');

INSERT INTO feedback_raw.comments(
  submission_id, question_id, consent_receipt_id, raw_text
)
SELECT
  submission.id,
  fixture_comment.question_id,
  receipt.id,
  fixture_comment.raw_text
FROM feedback_one_shot_comments fixture_comment
INNER JOIN feedback_one_shot_subjects fixture
  ON fixture.subject_index = fixture_comment.subject_index
INNER JOIN feedback_core.submissions submission
  ON submission.user_id = fixture.user_id
  AND submission.program_day = fixture_comment.program_day
INNER JOIN feedback_consent.text_consent_receipts receipt
  ON receipt.submission_id = submission.id;

DO $$
DECLARE
  fixture_subject record;
BEGIN
  FOR fixture_subject IN
    SELECT user_id FROM feedback_one_shot_subjects ORDER BY subject_index
  LOOP
    PERFORM set_config(
      'request.jwt.claim.sub', fixture_subject.user_id::text, true
    );
    UPDATE feedback_core.submissions submission
    SET status = 'submitted',
        submitted_at = clock_timestamp(),
        updated_at = clock_timestamp()
    WHERE submission.user_id = fixture_subject.user_id;
  END LOOP;
  PERFORM set_config('request.jwt.claim.sub', '', true);
END;
$$;

DO $$
DECLARE
  synthetic_subjects integer;
  synthetic_submissions integer;
  synthetic_answers integer;
  synthetic_comments integer;
  synthetic_snapshots integer;
BEGIN
  SELECT count(DISTINCT submission.subject_reference),
         count(DISTINCT submission.id),
         count(DISTINCT answer.id),
         count(DISTINCT comment.id),
         count(DISTINCT snapshot.submission_id)
  INTO synthetic_subjects, synthetic_submissions, synthetic_answers,
       synthetic_comments, synthetic_snapshots
  FROM feedback_core.submissions submission
  INNER JOIN feedback_one_shot_subjects fixture ON fixture.user_id = submission.user_id
  LEFT JOIN feedback_core.structured_answers answer ON answer.submission_id = submission.id
  LEFT JOIN feedback_raw.comments comment ON comment.submission_id = submission.id
  LEFT JOIN feedback_core.activity_snapshots snapshot ON snapshot.submission_id = submission.id;

  IF synthetic_subjects <> 15
     OR synthetic_submissions <> 60
     OR synthetic_answers <> 825
     OR synthetic_comments <> 20
     OR synthetic_snapshots <> 60 THEN
    RAISE EXCEPTION 'feedback_one_shot_fixture_count_drift:%/%/%/%/%',
      synthetic_subjects, synthetic_submissions, synthetic_answers,
      synthetic_comments, synthetic_snapshots;
  END IF;
END;
$$;

COMMIT;
