const campaign = {
  reference: "feedback-day-10-v1",
  content: "feedback-intelligence-content-v1.1.2",
  hash: "48c2bf887ec96a0cc49eb327b380f7da7d163beb08929b9b359bfa0356692f2c",
};

export const syntheticCommentLiteral = "SYNTHETIC_OPTIONAL_COMMENT_V1_1";
export const syntheticSubjects = [
  ["adult_structured", "adult", "declined"],
  ["age_16_17_structured", "age_16_17", "declined"],
  ["under_16_guardian_and_athlete", "under_16", "granted"],
  ["optional_comment", "adult", "granted"],
  ["comment_decline", "adult", "declined"],
  ["comment_withdrawal", "adult", "granted"],
  ["account_deletion", "adult", "granted"],
  ["offline_retry", "adult", "declined"],
].map(([id, ageBand, consent], index) => ({
  id, ageBand, consent, n: index + 1,
  user: `99081300-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
  instance: `99081310-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
  client: `99081320-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
  mutation1: `99081330-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
  mutation2: `99081340-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
}));

const sqlLiteral = (value) => `'${value.replaceAll("'", "''")}'`;
const assertResult = (label, expression, predicate) => `
DO $${label}$
DECLARE result jsonb;
BEGIN
  SELECT ${expression} INTO result;
  IF NOT (${predicate}) THEN RAISE EXCEPTION 'feedback_v1_1_smoke_${label}_failed'; END IF;
END;
$${label}$;`;

const actorSql = (subject) => {
  const comments = subject.consent === "granted"
    ? `'${JSON.stringify({ __closing_comment__: syntheticCommentLiteral })}'::jsonb`
    : `'{}'::jsonb`;
  const guardianReference = subject.ageBand === "under_16"
    ? `(SELECT consent_reference FROM feedback_consent.guardian_text_authorizations WHERE user_id='${subject.user}'::uuid AND state='granted')`
    : "NULL";
  const submitRevision = subject.id === "offline_retry" ? 2 : 1;
  const submitMutation = subject.id === "offline_retry" ? subject.mutation2 : subject.mutation1;
  let sql = `
SELECT pg_catalog.set_config('request.jwt.claim.sub', '${subject.user}', true);
SET LOCAL ROLE authenticated;
${assertResult(`${subject.id}_claim`, "public.claim_my_feedback_checkpoint()", "result->>'eligible' = 'true'")}
${assertResult(`${subject.id}_start`, `public.start_my_feedback_submission('${campaign.reference}', '${subject.client}'::uuid, '1.1.0+5', '${campaign.content}', '${campaign.hash}')`, "result->>'status' = 'draft'")}`;
  if (subject.id === "offline_retry") {
    sql += `
${assertResult(`${subject.id}_save`, `public.save_my_feedback_draft('${subject.client}'::uuid, 1, '${subject.mutation1}'::uuid, '{"d10_content_clarity":["1"]}'::jsonb, '{}'::jsonb, 'not_asked', NULL, 'questions', 'd10_content_clarity', ARRAY['d10_content_clarity']::text[])`, "result->>'client_revision' = '1'")}
${assertResult(`${subject.id}_same_retry`, `public.save_my_feedback_draft('${subject.client}'::uuid, 1, '${subject.mutation1}'::uuid, '{"d10_content_clarity":["1"]}'::jsonb, '{}'::jsonb, 'not_asked', NULL, 'questions', 'd10_content_clarity', ARRAY['d10_content_clarity']::text[])`, "result->>'idempotent' = 'true'")}
${assertResult(`${subject.id}_stale_retry`, `public.save_my_feedback_draft('${subject.client}'::uuid, 0, '${subject.mutation2}'::uuid, '{}'::jsonb, '{}'::jsonb, 'not_asked', NULL, 'intro', NULL, '{}'::text[])`, "result->>'stale_ignored' = 'true'")}`;
  }
  sql += `
${assertResult(`${subject.id}_submit`, `public.submit_my_feedback('${subject.client}'::uuid, ${submitRevision}, '${submitMutation}'::uuid, '{"d10_content_clarity":["2"]}'::jsonb, ${comments}, '${subject.consent}', ${guardianReference}, 'closing', NULL, ARRAY['d10_content_clarity']::text[])`, "result->>'status' = 'submitted'")}`;
  if (subject.id === "offline_retry") {
    sql += `
${assertResult(`${subject.id}_submit_retry`, `public.submit_my_feedback('${subject.client}'::uuid, 2, '${subject.mutation2}'::uuid, '{"d10_content_clarity":["2"]}'::jsonb, '{}'::jsonb, 'declined', NULL, 'closing', NULL, ARRAY['d10_content_clarity']::text[])`, "result->>'idempotent' = 'true'")}`;
  }
  if (subject.id === "comment_withdrawal") {
    sql += `
${assertResult(`${subject.id}_withdraw`, `public.withdraw_my_feedback_text((SELECT consent_reference FROM feedback_consent.text_consent_receipts WHERE user_id='${subject.user}'::uuid))`, "result->>'ok' = 'true'")}`;
  }
  sql += "\nRESET ROLE;";
  if (subject.id === "account_deletion") {
    sql += `
DELETE FROM auth.users WHERE id='${subject.user}'::uuid;
DO $account_deletion_assert$ BEGIN
  IF EXISTS (SELECT 1 FROM feedback_core.submissions WHERE user_id='${subject.user}'::uuid)
     OR EXISTS (SELECT 1 FROM feedback_raw.comments comment JOIN feedback_core.submissions submission ON submission.id=comment.submission_id WHERE submission.user_id='${subject.user}'::uuid)
  THEN RAISE EXCEPTION 'feedback_v1_1_smoke_account_deletion_failed'; END IF;
END; $account_deletion_assert$;`;
  }
  return sql;
};

export const composeActivationSmokeSql = ({ legalReference }) => {
  if (typeof legalReference !== "string"
      || !/^legal-review-de-feedback-v1\.1:[A-Za-z0-9][A-Za-z0-9._/-]{15,159}$/u.test(legalReference)
      || /(draft|pending|unreviewed|synthetic|test|fixture)/iu.test(legalReference)) {
    throw new Error("qualified legal-review reference required before composing activation smoke");
  }
  const ids = syntheticSubjects.map(({ user }) => `'${user}'::uuid`).join(",");
  const fixtureSql = syntheticSubjects.map((subject) => `
INSERT INTO auth.users(id) VALUES ('${subject.user}'::uuid);
UPDATE public.profiles SET is_test_user=true WHERE id='${subject.user}'::uuid;
INSERT INTO public.program_instances(id,user_id,status,started_at,is_test_instance)
VALUES ('${subject.instance}'::uuid,'${subject.user}'::uuid,'active',current_date-9,true);
INSERT INTO minor_auth.participant_authorizations(
 user_id,policy_id,jurisdiction,age_band,guardian_status,athlete_status,product_status,
 data_contribution_guardian,data_contribution_athlete,data_contribution_status,
 guardian_authorized_at,athlete_assented_at,product_authorized_at,revoked_at
) SELECT '${subject.user}'::uuid,policy.id,'DE','${subject.ageBand}',
 '${subject.ageBand === "under_16" ? "authorized" : "not_required"}',
 '${subject.ageBand === "adult" ? "not_required" : "authorized"}','authorized',
 ${subject.ageBand === "under_16" ? "true" : "NULL"},true,'authorized',
 ${subject.ageBand === "under_16" ? "now()" : "NULL"},${subject.ageBand === "adult" ? "NULL" : "now()"},now(),NULL
FROM minor_auth.policy_versions policy WHERE policy.jurisdiction='DE' AND policy.status='active'
ORDER BY policy.effective_from DESC LIMIT 1;`).join("\n");
  const guardian = syntheticSubjects.find(({ ageBand }) => ageBand === "under_16");
  return `BEGIN;
DO $preflight$ BEGIN
 IF EXISTS(SELECT 1 FROM auth.users WHERE id=ANY(ARRAY[${ids}]::uuid[]))
 THEN RAISE EXCEPTION 'feedback_v1_1_smoke_fixture_collision'; END IF;
END; $preflight$;
SELECT feedback_core.activate_feedback_v1_1(${sqlLiteral(legalReference)});
${fixtureSql}
INSERT INTO feedback_consent.guardian_text_authorizations(
 user_id,scope,consent_version,notice_hash,guardian_notice_hash,state,granted_at,policy_reference
) VALUES ('${guardian.user}'::uuid,'product-improvement-individual-text-ai-analysis-v1',
 'feedback-text-consent-v1.1.0','c308e8ad3d89b02c308a07090a4c09cb363f9cdb7d1e5d671ac295c545d95a16',
 '90b0ede2a1a7671f1631e2048a605e6331006972ee05e63d38d229857f0aeb0b','granted',now(),
 'guardian-feedback-text-de-v1.1.0');
${syntheticSubjects.map(actorSql).join("\n")}
DO $scenario_assert$ BEGIN
 IF (SELECT count(*) FROM feedback_core.submissions WHERE user_id=ANY(ARRAY[${ids}]::uuid[]) AND status='submitted') <> 7
 OR EXISTS(SELECT 1 FROM feedback_raw.comments WHERE raw_text <> '${syntheticCommentLiteral}')
 OR EXISTS(SELECT 1 FROM feedback_raw.comments comment JOIN feedback_core.submissions submission ON submission.id=comment.submission_id WHERE submission.user_id=(SELECT user_id FROM feedback_core.submissions WHERE client_submission_id='${syntheticSubjects[5].client}'::uuid))
 THEN RAISE EXCEPTION 'feedback_v1_1_smoke_scenario_postcondition_failed'; END IF;
END; $scenario_assert$;
SELECT feedback_core.reclose_feedback_v1_1(${sqlLiteral(legalReference)});
DELETE FROM auth.users WHERE id=ANY(ARRAY[${ids}]::uuid[]);
DO $cleanup_assert$ BEGIN
 IF EXISTS(SELECT 1 FROM auth.users WHERE id=ANY(ARRAY[${ids}]::uuid[]))
 OR EXISTS(SELECT 1 FROM feedback_core.submissions WHERE user_id=ANY(ARRAY[${ids}]::uuid[]))
 THEN RAISE EXCEPTION 'feedback_v1_1_smoke_cleanup_failed'; END IF;
END; $cleanup_assert$;
ROLLBACK;
SELECT json_build_object('status','PASS_FEEDBACK_V1_1_SYNTHETIC_SMOKE_ROLLED_BACK','scenario_count',8,
 'application_values_returned',false,'legal_reference_returned',false) AS feedback_v1_1_smoke_status;
`;
};

export const composeActivationPostrollbackAuditSql = () => {
  const ids = syntheticSubjects.map(({ user }) => `'${user}'::uuid`).join(",");
  return `DO $postrollback$ BEGIN
 IF EXISTS(SELECT 1 FROM auth.users WHERE id=ANY(ARRAY[${ids}]::uuid[]))
 OR EXISTS(SELECT 1 FROM feedback_core.submissions WHERE user_id=ANY(ARRAY[${ids}]::uuid[]))
 OR EXISTS(SELECT 1 FROM feedback_core.campaigns WHERE status='active')
 OR EXISTS(SELECT 1 FROM feedback_consent.guardian_text_policy_versions WHERE status='active')
 OR EXISTS(SELECT 1 FROM feedback_core.system_settings WHERE singleton AND
   (athlete_collection_enabled OR text_collection_enabled OR privacy_notice_ready OR app_store_declaration_ready OR minor_policy_ready))
 OR NOT EXISTS(SELECT 1 FROM feedback_core.jurisdiction_policies WHERE jurisdiction='DE'
   AND structured_collection_status='legal_review_required' AND raw_text_collection_status='legal_review_required'
   AND legal_review_reference IS NULL AND approved_at IS NULL)
 THEN RAISE EXCEPTION 'feedback_v1_1_smoke_postrollback_drift'; END IF;
END; $postrollback$;
SELECT json_build_object('status','PASS_FEEDBACK_V1_1_SYNTHETIC_SMOKE_POSTROLLBACK','fixture_rows',0,
 'runtime_gates_open',false,'application_values_returned',false) AS feedback_v1_1_postrollback_status;`;
};
