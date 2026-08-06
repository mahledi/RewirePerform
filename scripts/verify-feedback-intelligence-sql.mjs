import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import Ajv2020 from "ajv/dist/2020.js";

const db = new PGlite();
const migration = readFileSync(
  resolve("supabase/migrations/20260805103400_feedback_intelligence_v1_foundation.sql"),
  "utf8",
);
const securityMigration = readFileSync(
  resolve("supabase/migrations/20260805103500_feedback_intelligence_v1_security.sql"),
  "utf8",
);
const registryMigration = readFileSync(
  resolve("supabase/migrations/20260805103600_feedback_intelligence_v1_registry.sql"),
  "utf8",
);
const restVisualizationRegistryMigration = readFileSync(
  resolve("supabase/migrations/20260806110000_feedback_intelligence_rest_visualization_v1_1.sql"),
  "utf8",
);
const dachMinorPolicyMigration = readFileSync(
  resolve("supabase/migrations/20260805103650_feedback_intelligence_v1_dach_minor_policy.sql"),
  "utf8",
);
const transactionMigration = readFileSync(
  resolve("supabase/migrations/20260805103700_feedback_intelligence_v1_transaction_api.sql"),
  "utf8",
);
const activityMigration = readFileSync(
  resolve("supabase/migrations/20260805103840_feedback_intelligence_v1_activity_snapshot.sql"),
  "utf8",
);
const adminAggregateMigration = readFileSync(
  resolve("supabase/migrations/20260805103900_feedback_intelligence_v1_admin_aggregates.sql"),
  "utf8",
);
const machineExportMigration = readFileSync(
  resolve("supabase/migrations/20260805104000_feedback_intelligence_v0_2_machine_export.sql"),
  "utf8",
);
const consentSelfServiceMigration = readFileSync(
  resolve("supabase/migrations/20260805104100_feedback_intelligence_v1_consent_self_service.sql"),
  "utf8",
);
const fkIndexesMigration = readFileSync(
  resolve("supabase/migrations/20260806081925_feedback_intelligence_fk_indexes.sql"),
  "utf8",
);
const machineExportSchema = JSON.parse(readFileSync(
  resolve("docs/feedback-intelligence/contracts/v0.2/proposed-export.schema.json"),
  "utf8",
));

const ids = {
  user: "00000000-0000-4000-8000-000000001101",
  instance: "10000000-0000-4000-8000-000000001101",
  minor: "00000000-0000-4000-8000-000000001102",
  minorInstance: "10000000-0000-4000-8000-000000001102",
  transactionUser: "00000000-0000-4000-8000-000000001103",
  transactionInstance: "10000000-0000-4000-8000-000000001103",
  transactionClient: "20000000-0000-4000-8000-000000001103",
  transactionMutation1: "30000000-0000-4000-8000-000000001103",
  transactionMutation2: "30000000-0000-4000-8000-000000001104",
};

const aggregateUsers = [1, 2, 3, 4].map((index) => ({
  user: `00000000-0000-4000-8000-00000000120${index}`,
  instance: `10000000-0000-4000-8000-00000000120${index}`,
  client: `20000000-0000-4000-8000-00000000120${index}`,
}));
const machineUsers = [1, 2, 3, 4, 5, 6].map((index) => ({
  user: `00000000-0000-4000-8000-00000000130${index}`,
  instance: `10000000-0000-4000-8000-00000000130${index}`,
  client: `20000000-0000-4000-8000-00000000130${index}`,
  jurisdiction: index === 6 ? "AT" : "DE",
}));

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const expectFailure = async (task, expectedMessage) => {
  try {
    await task();
  } catch (error) {
    assert(
      String(error).toLowerCase().includes(expectedMessage.toLowerCase()),
      `Expected ${expectedMessage}, received ${String(error)}`,
    );
    return;
  }
  throw new Error(`Expected failure containing ${expectedMessage}`);
};

const setActor = async (userId) => {
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [userId]);
};

try {
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE SCHEMA minor_auth;
    CREATE SCHEMA extensions;
    CREATE TYPE public.app_role AS ENUM ('athlete', 'coach', 'admin');
    CREATE FUNCTION auth.uid()
    RETURNS uuid
    LANGUAGE sql
    STABLE
    AS $$
      SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE TABLE public.program_instances(
      id uuid PRIMARY KEY,
      user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      status text NOT NULL DEFAULT 'active',
      started_at date NOT NULL DEFAULT current_date,
      created_at timestamptz NOT NULL DEFAULT now(),
      is_test_instance boolean NOT NULL DEFAULT false
    );
    CREATE TABLE public.profiles(
      id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      is_test_user boolean NOT NULL DEFAULT false
    );
    CREATE TABLE public.user_day_assignments(
      id uuid PRIMARY KEY,
      date date NOT NULL
    );
    CREATE TABLE public.user_day_completion(
      id uuid PRIMARY KEY,
      user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      program_instance_id uuid REFERENCES public.program_instances(id) ON DELETE CASCADE,
      assignment_id uuid NOT NULL REFERENCES public.user_day_assignments(id),
      day_number integer NOT NULL,
      completion_status text NOT NULL,
      task_completion jsonb NOT NULL DEFAULT '[]'::jsonb,
      completed_at timestamptz
    );
    CREATE TABLE public.daily_checkins(
      id uuid PRIMARY KEY,
      user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
      program_instance_id uuid REFERENCES public.program_instances(id) ON DELETE CASCADE,
      date date NOT NULL
    );
    CREATE TABLE public.daily_journals(
      id uuid PRIMARY KEY,
      user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      program_instance_id uuid REFERENCES public.program_instances(id) ON DELETE CASCADE,
      date date NOT NULL
    );
    CREATE TABLE minor_auth.policy_versions(
      id uuid PRIMARY KEY,
      jurisdiction text NOT NULL,
      status text NOT NULL,
      effective_from date NOT NULL
    );
    CREATE TABLE minor_auth.participant_authorizations(
      user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      policy_id uuid NOT NULL REFERENCES minor_auth.policy_versions(id),
      age_band text NOT NULL,
      product_status text NOT NULL,
      revoked_at timestamptz
    );
    CREATE FUNCTION minor_auth.enforcement_enabled()
    RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
    AS $$ SELECT true $$;
    CREATE FUNCTION public.get_effective_today(_user_id uuid)
    RETURNS date LANGUAGE sql STABLE SECURITY DEFINER
    AS $$ SELECT current_date $$;
    CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
    RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
    AS $$ SELECT COALESCE(current_setting('request.jwt.claim.role', true) = _role::text, false) $$;
    CREATE FUNCTION extensions.digest(_input bytea, _algorithm text)
    RETURNS bytea LANGUAGE sql IMMUTABLE
    AS $$
      SELECT decode(
        md5(encode(_input, 'escape')) || md5('second:' || encode(_input, 'escape')),
        'hex'
      )
      WHERE _algorithm = 'sha256'
    $$;
  `);

  await db.exec(migration);
  await db.exec(securityMigration);
  await db.exec(registryMigration);
  await db.exec(restVisualizationRegistryMigration);
  await db.exec(dachMinorPolicyMigration);
  await db.exec(transactionMigration);
  await db.exec(activityMigration);
  await db.exec(adminAggregateMigration);
  await db.exec(machineExportMigration);
  await db.exec(consentSelfServiceMigration);
  await db.exec(fkIndexesMigration);

  const feedbackFkIndexes = await db.query(`
    SELECT indexname
    FROM pg_indexes
    WHERE indexname IN (
      'feedback_consent_audit_submission_idx',
      'feedback_checkpoint_campaign_idx',
      'feedback_checkpoint_program_instance_idx',
      'feedback_subject_links_program_instance_idx'
    )
  `);
  assert(
    feedbackFkIndexes.rows.length === 4,
    "all Feedback Intelligence foreign-key indexes must exist",
  );

  const schemas = await db.query(`
    SELECT schema_name
    FROM information_schema.schemata
    WHERE schema_name IN (
      'feedback_core',
      'feedback_consent',
      'feedback_raw',
      'feedback_analysis'
    )
  `);
  assert(schemas.rows.length === 4, "all four private feedback schemas must exist");

  const privileges = await db.query(`
    SELECT
      has_schema_privilege('authenticated', 'feedback_core', 'USAGE') AS authenticated_core_usage,
      has_schema_privilege('service_role', 'feedback_raw', 'USAGE') AS service_raw_usage,
      has_table_privilege('authenticated', 'feedback_core.structured_answers', 'SELECT') AS authenticated_structured_select,
      has_table_privilege('service_role', 'feedback_raw.comments', 'SELECT') AS service_raw_select,
      has_table_privilege('service_role', 'feedback_core.activity_snapshots', 'SELECT') AS service_activity_select,
      has_function_privilege(
        'authenticated',
        'public.read_feedback_intelligence_v0_2_draft(text,text,text,text)',
        'EXECUTE'
      ) AS authenticated_machine_execute,
      has_function_privilege(
        'service_role',
        'public.read_feedback_intelligence_v0_2_draft(text,text,text,text)',
        'EXECUTE'
      ) AS service_machine_execute,
      has_function_privilege(
        'anon',
        'public.read_feedback_intelligence_v0_2_draft(text,text,text,text)',
        'EXECUTE'
      ) AS anon_machine_execute,
      has_function_privilege(
        'authenticated',
        'public.list_my_feedback_text_consents()',
        'EXECUTE'
      ) AS authenticated_consent_list_execute,
      has_function_privilege(
        'anon',
        'public.list_my_feedback_text_consents()',
        'EXECUTE'
      ) AS anon_consent_list_execute,
      has_function_privilege(
        'service_role',
        'public.list_my_feedback_text_consents()',
        'EXECUTE'
      ) AS service_consent_list_execute
  `);
  assert(privileges.rows[0].authenticated_core_usage === false, "authenticated must not use feedback_core directly");
  assert(privileges.rows[0].service_raw_usage === false, "service_role must not use feedback_raw directly");
  assert(privileges.rows[0].authenticated_structured_select === false, "authenticated must not read structured tables directly");
  assert(privileges.rows[0].service_raw_select === false, "service_role must not read raw comments directly");
  assert(privileges.rows[0].service_activity_select === false, "service_role must not read activity snapshots directly");
  assert(privileges.rows[0].authenticated_machine_execute === false, "authenticated must not execute machine export");
  assert(privileges.rows[0].service_machine_execute === false, "service_role must not execute machine export");
  assert(privileges.rows[0].anon_machine_execute === false, "anon must not execute machine export");
  assert(privileges.rows[0].authenticated_consent_list_execute === true, "authenticated athlete must list own consent receipts");
  assert(privileges.rows[0].anon_consent_list_execute === false, "anon must not list consent receipts");
  assert(privileges.rows[0].service_consent_list_execute === false, "service_role must not list athlete consent receipts");

  await db.exec(`
    INSERT INTO auth.users(id) VALUES ('${ids.user}'), ('${ids.minor}'), ('${ids.transactionUser}');
    INSERT INTO public.profiles(id) VALUES ('${ids.user}'), ('${ids.minor}'), ('${ids.transactionUser}');
    INSERT INTO public.program_instances(id, user_id)
    VALUES
      ('${ids.instance}', '${ids.user}'),
      ('${ids.minorInstance}', '${ids.minor}');
    INSERT INTO public.program_instances(id, user_id, status, started_at)
    VALUES ('${ids.transactionInstance}', '${ids.transactionUser}', 'active', current_date - 9);
    INSERT INTO minor_auth.policy_versions(id, jurisdiction, status, effective_from)
    VALUES ('40000000-0000-4000-8000-000000001103', 'DE', 'active', current_date - 30);
    INSERT INTO minor_auth.participant_authorizations(
      user_id, policy_id, age_band, product_status
    ) VALUES (
      '${ids.transactionUser}', '40000000-0000-4000-8000-000000001103', 'adult', 'authorized'
    );
  `);

  await db.exec("SET ROLE authenticated");
  await expectFailure(
    () => db.exec("SELECT * FROM feedback_core.campaigns"),
    "permission denied",
  );
  await db.exec("RESET ROLE");

  await db.exec("SET ROLE authenticated");
  await expectFailure(
    () => db.query(`
      SELECT public.read_feedback_intelligence_v0_2_draft(
        'jarvis-test', '0.2.0-draft',
        'fb1ef751bc4701a497f224bb421220e08b3387eba5c2eaec9e91e2cbf474b4e9',
        'synthetic'
      )
    `),
    "permission denied",
  );
  await db.exec("RESET ROLE");
  await expectFailure(
    () => db.query(`
      SELECT public.read_feedback_intelligence_v0_2_draft(
        'jarvis-test', '0.2.0-draft',
        'fb1ef751bc4701a497f224bb421220e08b3387eba5c2eaec9e91e2cbf474b4e9',
        'synthetic'
      )
    `),
    "feedback_machine_contract_not_ready",
  );

  const machineCampaign = await db.query(`
    SELECT id
    FROM feedback_core.campaigns
    WHERE campaign_reference = 'feedback-day-10-v1'
  `);
  const machineCampaignId = machineCampaign.rows[0].id;
  const machineQuestionDefinition = await db.query(`
    SELECT id
    FROM feedback_core.question_definitions
    WHERE campaign_id = $1 AND question_id = 'd10_content_clarity'
  `, [machineCampaignId]);

  for (const [index, machineUser] of machineUsers.entries()) {
    await db.query("INSERT INTO auth.users(id) VALUES ($1)", [machineUser.user]);
    await db.query("INSERT INTO public.profiles(id, is_test_user) VALUES ($1, true)", [machineUser.user]);
    await db.query(`
      INSERT INTO public.program_instances(id, user_id, status, started_at, is_test_instance)
      VALUES ($1, $2, 'completed', current_date - 9, true)
    `, [machineUser.instance, machineUser.user]);
    const machineSubject = await db.query(`
      INSERT INTO feedback_core.subject_links(user_id, program_instance_id)
      VALUES ($1, $2)
      RETURNING subject_reference
    `, [machineUser.user, machineUser.instance]);
    const machineSubmission = await db.query(`
      INSERT INTO feedback_core.submissions(
        client_submission_id, campaign_id, user_id, subject_reference,
        program_instance_id, questionnaire_version, language, product_version,
        content_version, program_day, jurisdiction_at_submit, age_band_at_submit,
        product_authorization_basis, status
      ) VALUES (
        $1, $2, $3, $4, $5, 'feedback-d10-v1.1.0', 'de', '1.1.0+5',
        'feedback-intelligence-content-v1.1.0', 10, $6, 'adult',
        'adult_or_not_required', 'draft'
      ) RETURNING id
    `, [
      machineUser.client,
      machineCampaignId,
      machineUser.user,
      machineSubject.rows[0].subject_reference,
      machineUser.instance,
      machineUser.jurisdiction,
    ]);
    await db.query(`
      INSERT INTO feedback_core.structured_answers(
        submission_id, question_definition_id, selected_option_ids
      ) VALUES ($1, $2, '["2"]'::jsonb)
    `, [machineSubmission.rows[0].id, machineQuestionDefinition.rows[0].id]);
    await db.query(`
      INSERT INTO feedback_core.activity_snapshots(
        submission_id, observation_end_program_day, program_days_available,
        program_days_completed, checkins_completed, journal_entries_created_count,
        tasks_completed, transfer_pulse_count, resume_delay_bucket,
        continuation_status_bucket
      ) VALUES ($1, 10, 10, $2, $2, $3, $2, NULL,
        'NO_RESUME_NEEDED', 'ACTIVE_OR_COMPLETED')
    `, [machineSubmission.rows[0].id, index + 5, index]);
    if (index === 0) {
      const machineReceipt = await db.query(`
        INSERT INTO feedback_consent.text_consent_receipts(
          submission_id, user_id, state, scope, consent_version,
          notice_hash, granted_at
        ) VALUES (
          $1, $2, 'granted', 'product-improvement-individual-text-ai-analysis-v1',
          'feedback-text-consent-v1.0.0-draft',
          '7da3fee62d13672430e7c288274994f3d284ad8dfd1b73a92ecc0c8d15962af4',
          now()
        ) RETURNING id
      `, [machineSubmission.rows[0].id, machineUser.user]);
      await db.query(`
        INSERT INTO feedback_raw.comments(
          submission_id, question_id, consent_receipt_id, raw_text
        ) VALUES ($1, 'd10_content_clarity', $2, 'Nur synthetischer Exporttext.')
      `, [machineSubmission.rows[0].id, machineReceipt.rows[0].id]);
    }
    await db.query(`
      UPDATE feedback_core.submissions
      SET status = 'submitted', submitted_at = now()
      WHERE id = $1
    `, [machineSubmission.rows[0].id]);
  }

  await db.exec(`
    UPDATE feedback_core.machine_contract_settings
    SET consumer_pin_ready = true,
        synthetic_export_enabled = true
    WHERE contract_version = '0.2.0-draft';
  `);
  const machineExport = await db.query(`
    SELECT public.read_feedback_intelligence_v0_2_draft(
      'jarvis-synthetic-contract-test', '0.2.0-draft',
      'fb1ef751bc4701a497f224bb421220e08b3387eba5c2eaec9e91e2cbf474b4e9',
      'synthetic'
    ) AS result
  `);
  const machinePayload = machineExport.rows[0].result;
  assert(
    machinePayload.items.length === 5,
    "the five German synthetic subjects must export while the out-of-scope Austrian subject is excluded",
  );
  assert(
    machinePayload.items.every((item) =>
      /^[a-f0-9]{64}$/.test(item.feedback_reference)
      && /^[a-f0-9]{64}$/.test(item.campaign_reference)
      && /^[a-f0-9]{64}$/.test(item.subject_reference)
    ),
    "machine references must be namespaced 64-character lowercase hashes",
  );
  assert(
    machinePayload.items.every((item) => item.product_version === "1.1.0_build_5"),
    "SemVer build metadata must use the documented consumer-safe encoding",
  );
  assert(
    machinePayload.items.filter((item) => item.comment !== null).length === 1
      && machinePayload.items.find((item) => item.comment !== null)?.consent.valid_at_export === true,
    "raw feedback must appear only with currently valid consent",
  );
  const validateMachineExport = new Ajv2020({ strict: false, validateFormats: false })
    .compile(machineExportSchema);
  assert(
    validateMachineExport(machinePayload),
    `machine payload must match the byte-pinned consumer schema: ${JSON.stringify(validateMachineExport.errors)}`,
  );
  await expectFailure(
    () => db.query(`
      SELECT public.read_feedback_intelligence_v0_2_draft(
        'jarvis-synthetic-contract-test', '0.2.0-draft',
        'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        'synthetic'
      )
    `),
    "feedback_machine_contract_drift",
  );
  await expectFailure(
    () => db.query(`
      SELECT public.read_feedback_intelligence_v0_2_draft(
        'jarvis-synthetic-contract-test', '0.2.0-draft',
        'fb1ef751bc4701a497f224bb421220e08b3387eba5c2eaec9e91e2cbf474b4e9',
        'production'
      )
    `),
    "feedback_machine_production_export_disabled",
  );
  const machineAudit = await db.query(`
    SELECT outcome, returned_count
    FROM feedback_analysis.machine_access_log
    WHERE client_id = 'jarvis-synthetic-contract-test'
  `);
  assert(
    machineAudit.rows.length === 1
      && machineAudit.rows[0].outcome === "success"
      && machineAudit.rows[0].returned_count === 5,
    "successful synthetic machine export must create a minimized audit receipt",
  );
  await db.query(
    "UPDATE public.profiles SET is_test_user = false WHERE id = $1",
    [machineUsers.find((user) => user.jurisdiction === "AT").user],
  );

  await db.exec("SET ROLE service_role");
  await expectFailure(
    () => db.exec("SELECT * FROM feedback_raw.comments"),
    "permission denied",
  );
  await db.exec("RESET ROLE");

  const registry = await db.query(`
    SELECT
      (SELECT COUNT(*)::integer FROM feedback_core.campaigns) AS campaign_count,
      (SELECT COUNT(*)::integer FROM feedback_core.question_definitions) AS question_count,
      (SELECT COUNT(*)::integer FROM feedback_core.campaigns WHERE status = 'draft') AS draft_count
  `);
  assert(registry.rows[0].campaign_count === 4, "all four campaigns must be registered");
  assert(registry.rows[0].question_count === 55, "all 55 question definitions must be registered");
  assert(registry.rows[0].draft_count === 4, "registry must not activate any campaign");

  const visualizationRegistry = await db.query(`
    SELECT campaign.checkpoint_day, question.position, question.question_id,
      question.option_ids, campaign.questionnaire_version, campaign.content_version,
      campaign.questionnaire_manifest_hash, campaign.status
    FROM feedback_core.question_definitions question
    INNER JOIN feedback_core.campaigns campaign ON campaign.id = question.campaign_id
    WHERE question.question_id LIKE '%_rest_visualization_%'
    ORDER BY campaign.checkpoint_day, question.position
  `);
  const expectedVisualizationPositions = [
    [10, 7, "d10_rest_visualization_guidance_clarity"],
    [10, 8, "d10_rest_visualization_practical_access"],
    [24, 6, "d24_rest_visualization_guidance_clarity"],
    [24, 7, "d24_rest_visualization_practical_access"],
    [39, 4, "d39_rest_visualization_self_direction"],
    [39, 5, "d39_rest_visualization_practical_access"],
    [55, 4, "d55_rest_visualization_integration"],
    [55, 5, "d55_rest_visualization_continuation_intent"],
  ];
  assert(
    JSON.stringify(visualizationRegistry.rows.map((row) => [
      row.checkpoint_day, row.position, row.question_id,
    ])) === JSON.stringify(expectedVisualizationPositions),
    "exactly two rest-day visualization questions must occupy the pinned positions per checkpoint",
  );
  assert(
    visualizationRegistry.rows.every((row) =>
      row.option_ids.includes("not_used")
      && row.questionnaire_version === `feedback-d${row.checkpoint_day}-v1.1.0`
      && row.content_version === "feedback-intelligence-content-v1.1.0"
      && row.status === "draft"
      && /^[a-f0-9]{64}$/.test(row.questionnaire_manifest_hash)),
    "visualization questions must preserve not_used and remain pinned to draft-only v1.1 registries",
  );

  const jurisdictionPolicies = await db.query(`
    SELECT jurisdiction, statutory_information_society_consent_age,
      structured_collection_status, raw_text_collection_status
    FROM feedback_core.jurisdiction_policies
    ORDER BY jurisdiction
  `);
  assert(jurisdictionPolicies.rows.length === 3, "Germany and the two explicit non-release jurisdictions must be present");
  const germanPolicy = jurisdictionPolicies.rows.find((row) => row.jurisdiction === "DE");
  assert(
    germanPolicy?.structured_collection_status === "legal_review_required"
      && germanPolicy.raw_text_collection_status === "legal_review_required",
    "Germany must start in legal review and remain fail-closed",
  );
  assert(
    jurisdictionPolicies.rows
      .filter((row) => row.jurisdiction !== "DE")
      .every((row) =>
        row.structured_collection_status === "out_of_scope"
        && row.raw_text_collection_status === "out_of_scope"
      ),
    "non-German jurisdictions must remain explicitly out of scope",
  );
  assert(
    germanPolicy?.statutory_information_society_consent_age === 16,
    "Germany must preserve the GDPR Article 8 default age",
  );
  assert(
    jurisdictionPolicies.rows.find((row) => row.jurisdiction === "AT")
      ?.statutory_information_society_consent_age === 14,
    "Austria must preserve its national Article 8 age",
  );
  assert(
    jurisdictionPolicies.rows.find((row) => row.jurisdiction === "CH")
      ?.statutory_information_society_consent_age === null,
    "Switzerland must not invent a fixed statutory age",
  );
  const nonGermanPolicyReadiness = await db.query(`
    SELECT
      feedback_core.jurisdiction_policy_ready('AT', false) AS at_structured_ready,
      feedback_core.jurisdiction_policy_ready('AT', true) AS at_text_ready,
      feedback_core.jurisdiction_policy_ready('CH', false) AS ch_structured_ready,
      feedback_core.jurisdiction_policy_ready('CH', true) AS ch_text_ready
  `);
  assert(
    Object.values(nonGermanPolicyReadiness.rows[0]).every((value) => value === false),
    "out-of-scope jurisdictions must fail closed for structured and raw-text collection",
  );

  const campaign = await db.query(`
    SELECT id
    FROM feedback_core.campaigns
    WHERE campaign_reference = 'feedback-day-10-v1'
  `);
  const campaignId = campaign.rows[0].id;

  const questionDefinition = await db.query(`
    SELECT id
    FROM feedback_core.question_definitions
    WHERE campaign_id = $1 AND question_id = 'd10_content_clarity'
  `, [campaignId]);

  const subject = await db.query(`
    INSERT INTO feedback_core.subject_links(user_id, program_instance_id)
    VALUES ($1, $2)
    RETURNING subject_reference
  `, [ids.user, ids.instance]);
  const subjectReference = subject.rows[0].subject_reference;

  const submission = await db.query(`
    INSERT INTO feedback_core.submissions(
      client_submission_id,
      campaign_id,
      user_id,
      subject_reference,
      program_instance_id,
      questionnaire_version,
      language,
      product_version,
      content_version,
      program_day,
      age_band_at_submit,
      product_authorization_basis
    )
    VALUES (
      '20000000-0000-4000-8000-000000001101',
      $1,
      $2,
      $3,
      $4,
      'feedback-d10-v1.1.0',
      'de',
      '1.1.0+5',
      'feedback-intelligence-content-v1.1.0',
      10,
      'adult',
      'adult_or_not_required'
    )
    RETURNING id
  `, [campaignId, ids.user, subjectReference, ids.instance]);
  const submissionId = submission.rows[0].id;

  await db.query(`
    INSERT INTO feedback_core.structured_answers(
      submission_id,
      question_definition_id,
      selected_option_ids
    )
    VALUES ($1, $2, '["2"]'::jsonb)
  `, [submissionId, questionDefinition.rows[0].id]);

  const receipt = await db.query(`
    INSERT INTO feedback_consent.text_consent_receipts(
      submission_id,
      user_id,
      state,
      scope,
      consent_version,
      notice_hash,
      granted_at
    )
    VALUES ($1, $2, 'granted', 'product-improvement-individual-text-ai-analysis-v1',
      'feedback-text-consent-v1.0.0-draft',
      '7da3fee62d13672430e7c288274994f3d284ad8dfd1b73a92ecc0c8d15962af4', now())
    RETURNING id
  `, [submissionId, ids.user]);

  const comment = await db.query(`
    INSERT INTO feedback_raw.comments(submission_id, question_id, consent_receipt_id, raw_text)
    VALUES ($1, 'd10_content_clarity', $2, 'Zu viel Text an Trainingstagen.')
    RETURNING id
  `, [submissionId, receipt.rows[0].id]);

  await db.query(`
    INSERT INTO feedback_analysis.comment_artifacts(
      comment_id,
      artifact_kind,
      artifact_version,
      processor_contract_version,
      artifact_payload
    )
    VALUES ($1, 'product_friction', 'theme-v1', 'feedback-processor-v1',
      '{"theme":"text_load"}'::jsonb)
  `, [comment.rows[0].id]);

  await expectFailure(
    () => db.query(`
      INSERT INTO feedback_raw.comments(submission_id, question_id, consent_receipt_id, raw_text)
      VALUES ($1, 'd10_unknown_question', $2, 'Should fail')
    `, [submissionId, receipt.rows[0].id]),
    "feedback_comment_question_invalid",
  );

  await setActor(ids.user);
  const consentReference = await db.query(
    "SELECT consent_reference FROM feedback_consent.text_consent_receipts WHERE id = $1",
    [receipt.rows[0].id],
  );
  await db.exec("SET ROLE authenticated");
  const ownConsentList = await db.query(
    "SELECT public.list_my_feedback_text_consents() AS result",
  );
  assert(
    ownConsentList.rows[0].result.length === 1
      && ownConsentList.rows[0].result[0].consent_reference === consentReference.rows[0].consent_reference
      && ownConsentList.rows[0].result[0].checkpoint_day === 10
      && ownConsentList.rows[0].result[0].state === "granted"
      && ownConsentList.rows[0].result[0].raw_text === undefined,
    "athlete consent list must expose only own minimized receipt metadata",
  );
  const withdrawal = await db.query(
    "SELECT public.withdraw_my_feedback_text($1) AS result",
    [consentReference.rows[0].consent_reference],
  );
  assert(withdrawal.rows[0].result.ok === true, "athlete withdrawal must succeed");
  const withdrawnConsentList = await db.query(
    "SELECT public.list_my_feedback_text_consents() AS result",
  );
  assert(
    withdrawnConsentList.rows[0].result[0].state === "withdrawn"
      && withdrawnConsentList.rows[0].result[0].withdrawn_at !== null,
    "athlete consent list must show the withdrawal without returning deleted text",
  );
  await db.exec("RESET ROLE");

  const afterWithdrawal = await db.query(`
    SELECT
      (SELECT COUNT(*)::integer FROM feedback_core.structured_answers WHERE submission_id = $1) AS structured_count,
      (SELECT COUNT(*)::integer FROM feedback_raw.comments WHERE submission_id = $1) AS raw_count,
      (SELECT COUNT(*)::integer FROM feedback_analysis.comment_artifacts) AS artifact_count,
      (SELECT state FROM feedback_consent.text_consent_receipts WHERE id = $2) AS consent_state,
      (SELECT COUNT(*)::integer FROM feedback_consent.audit_events WHERE submission_id = $1) AS audit_count
  `, [submissionId, receipt.rows[0].id]);
  assert(afterWithdrawal.rows[0].structured_count === 1, "withdrawal must preserve structured answers");
  assert(afterWithdrawal.rows[0].raw_count === 0, "withdrawal must delete raw text");
  assert(afterWithdrawal.rows[0].artifact_count === 0, "withdrawal must delete attributable artifacts");
  assert(afterWithdrawal.rows[0].consent_state === "withdrawn", "receipt must record withdrawal");
  assert(afterWithdrawal.rows[0].audit_count === 3, "withdrawal must create deletion and decision audit events");

  await expectFailure(
    () => db.query(`
      UPDATE feedback_consent.audit_events
      SET event_type = 'text_consent_declined'
      WHERE submission_id = $1
    `, [submissionId]),
    "feedback_consent_audit_is_append_only",
  );

  const minorSubject = await db.query(`
    INSERT INTO feedback_core.subject_links(user_id, program_instance_id)
    VALUES ($1, $2)
    RETURNING subject_reference
  `, [ids.minor, ids.minorInstance]);
  const minorSubmission = await db.query(`
    INSERT INTO feedback_core.submissions(
      client_submission_id,
      campaign_id,
      user_id,
      subject_reference,
      program_instance_id,
      questionnaire_version,
      language,
      product_version,
      content_version,
      program_day,
      age_band_at_submit,
      product_authorization_basis
    )
    VALUES (
      '20000000-0000-4000-8000-000000001102',
      $1, $2, $3, $4,
      'feedback-d10-v1.1.0', 'de', '1.1.0+5',
      'feedback-intelligence-content-v1.1.0', 10,
      'under_16', 'guardian_and_athlete_authorized'
    )
    RETURNING id
  `, [campaignId, ids.minor, minorSubject.rows[0].subject_reference, ids.minorInstance]);

  await expectFailure(
    () => db.query(`
      INSERT INTO feedback_consent.text_consent_receipts(
        submission_id, user_id, state, scope, consent_version, notice_hash, granted_at
      )
      VALUES ($1, $2, 'granted', 'product-improvement-individual-text-ai-analysis-v1',
      'feedback-text-consent-v1.0.0-draft',
      '7da3fee62d13672430e7c288274994f3d284ad8dfd1b73a92ecc0c8d15962af4', now())
    `, [minorSubmission.rows[0].id, ids.minor]),
    "guardian_feedback_text_scope_required",
  );

  const guardianAuthorization = await db.query(`
    INSERT INTO feedback_consent.guardian_text_authorizations(
      user_id, scope, consent_version, notice_hash, state, granted_at, policy_reference
    )
    VALUES ($1, 'product-improvement-individual-text-ai-analysis-v1',
      'feedback-text-consent-v1.0.0-draft',
      '7da3fee62d13672430e7c288274994f3d284ad8dfd1b73a92ecc0c8d15962af4', 'granted', now(),
      'guardian-feedback-text-v1-draft')
    RETURNING consent_reference
  `, [ids.minor]);

  const minorReceipt = await db.query(`
    INSERT INTO feedback_consent.text_consent_receipts(
      submission_id, user_id, state, scope, consent_version, notice_hash,
      guardian_authorization_reference, granted_at
    )
    VALUES ($1, $2, 'granted', 'product-improvement-individual-text-ai-analysis-v1',
      'feedback-text-consent-v1.0.0-draft',
      '7da3fee62d13672430e7c288274994f3d284ad8dfd1b73a92ecc0c8d15962af4', $3, now())
    RETURNING id
  `, [minorSubmission.rows[0].id, ids.minor, guardianAuthorization.rows[0].consent_reference]);

  await db.query(`
    INSERT INTO feedback_raw.comments(submission_id, question_id, consent_receipt_id, raw_text)
    VALUES ($1, 'd10_content_clarity', $2, 'Synthetic minor text')
  `, [minorSubmission.rows[0].id, minorReceipt.rows[0].id]);

  await db.query(`
    UPDATE feedback_consent.guardian_text_authorizations
    SET state = 'withdrawn', withdrawn_at = now()
    WHERE consent_reference = $1
  `, [guardianAuthorization.rows[0].consent_reference]);

  const minorAfterGuardianWithdrawal = await db.query(`
    SELECT
      (SELECT state FROM feedback_consent.text_consent_receipts WHERE id = $1) AS consent_state,
      (SELECT COUNT(*)::integer FROM feedback_raw.comments WHERE submission_id = $2) AS raw_count
  `, [minorReceipt.rows[0].id, minorSubmission.rows[0].id]);
  assert(minorAfterGuardianWithdrawal.rows[0].consent_state === "withdrawn", "guardian withdrawal must revoke minor text consent");
  assert(minorAfterGuardianWithdrawal.rows[0].raw_count === 0, "guardian withdrawal must delete minor raw text");

  await db.exec(`
    UPDATE feedback_core.system_settings
    SET athlete_collection_enabled = true,
        text_collection_enabled = true,
        privacy_notice_ready = true,
        app_store_declaration_ready = true,
        minor_policy_ready = true
    WHERE singleton;
    UPDATE feedback_core.campaigns
    SET status = 'active', available_from = now()
    WHERE campaign_reference = 'feedback-day-10-v1';
  `);

  await setActor(ids.transactionUser);
  await db.exec("SET ROLE authenticated");
  const blockedBeforeJurisdictionApproval = await db.query(
    "SELECT public.claim_my_feedback_checkpoint() AS result",
  );
  assert(
    blockedBeforeJurisdictionApproval.rows[0].result.eligible === false
      && blockedBeforeJurisdictionApproval.rows[0].result.reason === "actor_policy_not_ready",
    "global switches must not bypass the jurisdiction legal-review gate",
  );
  await db.exec("RESET ROLE");
  await db.exec(`
    UPDATE feedback_core.jurisdiction_policies
    SET structured_collection_status = 'approved',
        raw_text_collection_status = 'approved',
        legal_review_reference = 'synthetic-sql-test-only',
        approved_at = now()
    WHERE jurisdiction = 'DE';
  `);
  await db.exec("SET ROLE authenticated");
  const firstClaim = await db.query("SELECT public.claim_my_feedback_checkpoint() AS result");
  assert(firstClaim.rows[0].result.eligible === true, "exact day 10 checkpoint must be claimable");
  assert(firstClaim.rows[0].result.mode === "invitation", "first checkpoint claim must be an invitation");
  const repeatedClaim = await db.query("SELECT public.claim_my_feedback_checkpoint() AS result");
  assert(repeatedClaim.rows[0].result.eligible === false, "invitation must be claimed at most once");
  assert(repeatedClaim.rows[0].result.reason === "already_invited", "repeat claim must explain its closed state");

  const started = await db.query(`
    SELECT public.start_my_feedback_submission(
      'feedback-day-10-v1', $1, '1.1.0+5',
      'feedback-intelligence-content-v1.1.0',
      'e19d61dc9600f1fd1c1667d1e9ca2a4e4c2c0dc252f4e18ca5efebce132c4a57'
    ) AS result
  `, [ids.transactionClient]);
  assert(started.rows[0].result.status === "draft", "claimed checkpoint must start a draft");

  await expectFailure(
    () => db.query(`
      SELECT public.save_my_feedback_draft(
        $1, 1, $2, '{"d10_content_clarity":["not_allowed"]}'::jsonb,
        '{}'::jsonb, 'not_asked', NULL, 'questions', 'd10_task_clarity',
        ARRAY['d10_content_clarity']::text[]
      )
    `, [ids.transactionClient, ids.transactionMutation1]),
    "feedback_option_selection_invalid",
  );

  const saved = await db.query(`
    SELECT public.save_my_feedback_draft(
      $1, 1, $2, '{"d10_content_clarity":["1"]}'::jsonb,
      '{}'::jsonb, 'not_asked', NULL, 'questions', 'd10_task_clarity',
      ARRAY['d10_content_clarity']::text[]
    ) AS result
  `, [ids.transactionClient, ids.transactionMutation1]);
  assert(saved.rows[0].result.client_revision === 1, "valid draft must persist revision 1");
  const retriedSave = await db.query(`
    SELECT public.save_my_feedback_draft(
      $1, 1, $2, '{"d10_content_clarity":["1"]}'::jsonb,
      '{}'::jsonb, 'not_asked', NULL, 'questions', 'd10_task_clarity',
      ARRAY['d10_content_clarity']::text[]
    ) AS result
  `, [ids.transactionClient, ids.transactionMutation1]);
  assert(retriedSave.rows[0].result.idempotent === true, "same revision and mutation must be idempotent");

  const staleSave = await db.query(`
    SELECT public.save_my_feedback_draft(
      $1, 0, $2, '{}'::jsonb, '{}'::jsonb, 'not_asked', NULL,
      'intro', NULL, '{}'::text[]
    ) AS result
  `, [ids.transactionClient, ids.transactionMutation2]);
  assert(staleSave.rows[0].result.stale_ignored === true, "stale offline retry must not overwrite revision 1");

  await db.exec("RESET ROLE");
  await db.exec(`
    INSERT INTO public.user_day_assignments(id, date) VALUES
      ('60000000-0000-4000-8000-000000001101', current_date - 9),
      ('60000000-0000-4000-8000-000000001103', current_date - 7);
    INSERT INTO public.user_day_completion(
      id, user_id, program_instance_id, assignment_id, day_number,
      completion_status, task_completion, completed_at
    ) VALUES
      ('61000000-0000-4000-8000-000000001101', '${ids.transactionUser}',
       '${ids.transactionInstance}', '60000000-0000-4000-8000-000000001101', 1,
       'completed', '["task-a","task-b"]'::jsonb, now() - interval '9 days'),
      ('61000000-0000-4000-8000-000000001103', '${ids.transactionUser}',
       '${ids.transactionInstance}', '60000000-0000-4000-8000-000000001103', 3,
       'completed', '["task-c"]'::jsonb, now() - interval '7 days');
    INSERT INTO public.daily_checkins(id, user_id, program_instance_id, date) VALUES
      ('62000000-0000-4000-8000-000000001101', '${ids.transactionUser}', '${ids.transactionInstance}', current_date - 9),
      ('62000000-0000-4000-8000-000000001103', '${ids.transactionUser}', '${ids.transactionInstance}', current_date - 7),
      ('62000000-0000-4000-8000-000000001110', '${ids.transactionUser}', '${ids.transactionInstance}', current_date);
    INSERT INTO public.daily_journals(id, user_id, program_instance_id, date) VALUES
      ('63000000-0000-4000-8000-000000001101', '${ids.transactionUser}', '${ids.transactionInstance}', current_date - 9),
      ('63000000-0000-4000-8000-000000001103', '${ids.transactionUser}', '${ids.transactionInstance}', current_date - 7);
  `);
  await db.exec("SET ROLE authenticated");

  const finalized = await db.query(`
    SELECT public.submit_my_feedback(
      $1, 2, $2, '{"d10_content_clarity":["2"]}'::jsonb,
      '{}'::jsonb, 'declined', NULL, 'closing', NULL,
      ARRAY['d10_content_clarity']::text[]
    ) AS result
  `, [ids.transactionClient, ids.transactionMutation2]);
  assert(finalized.rows[0].result.status === "submitted", "submit must finalize atomically");
  const retriedSubmit = await db.query(`
    SELECT public.submit_my_feedback(
      $1, 2, $2, '{"d10_content_clarity":["2"]}'::jsonb,
      '{}'::jsonb, 'declined', NULL, 'closing', NULL,
      ARRAY['d10_content_clarity']::text[]
    ) AS result
  `, [ids.transactionClient, ids.transactionMutation2]);
  assert(retriedSubmit.rows[0].result.idempotent === true, "final submit retry must be idempotent");
  await db.exec("RESET ROLE");

  const finalizedState = await db.query(`
    SELECT submission.status, submission.client_revision,
      answer.selected_option_ids,
      checkpoint.state AS checkpoint_state
    FROM feedback_core.submissions submission
    INNER JOIN feedback_core.structured_answers answer ON answer.submission_id = submission.id
    INNER JOIN feedback_core.checkpoint_states checkpoint
      ON checkpoint.user_id = submission.user_id
      AND checkpoint.campaign_id = submission.campaign_id
      AND checkpoint.program_instance_id = submission.program_instance_id
    WHERE submission.client_submission_id = $1
  `, [ids.transactionClient]);
  assert(finalizedState.rows[0].status === "submitted", "submission row must be immutable after finalization");
  assert(finalizedState.rows[0].client_revision === 2, "final revision must be retained");
  assert(finalizedState.rows[0].selected_option_ids[0] === "2", "latest structured snapshot must win");
  assert(finalizedState.rows[0].checkpoint_state === "submitted", "checkpoint state must finalize with submission");

  const activitySnapshot = await db.query(`
    SELECT snapshot.*
    FROM feedback_core.activity_snapshots snapshot
    INNER JOIN feedback_core.submissions submission ON submission.id = snapshot.submission_id
    WHERE submission.client_submission_id = $1
  `, [ids.transactionClient]);
  assert(activitySnapshot.rows.length === 1, "submit must freeze exactly one activity snapshot");
  assert(activitySnapshot.rows[0].observation_end_program_day === 10, "activity window must end at checkpoint day");
  assert(activitySnapshot.rows[0].program_days_available === 10, "day 10 must expose ten available days");
  assert(activitySnapshot.rows[0].program_days_completed === 2, "activity must count completed days only");
  assert(activitySnapshot.rows[0].checkins_completed === 3, "activity must count check-in dates only");
  assert(activitySnapshot.rows[0].journal_entries_created_count === 2, "activity must count journals without reading text");
  assert(activitySnapshot.rows[0].tasks_completed === 3, "activity must count task identifiers without exporting them");
  assert(activitySnapshot.rows[0].transfer_pulse_count === null, "transfer pulse must remain unavailable until separately approved");
  assert(activitySnapshot.rows[0].resume_delay_bucket === "DAYS_4_7", "resume bucket must use only coarse date gaps");
  assert(activitySnapshot.rows[0].continuation_status_bucket === "ACTIVE_OR_COMPLETED", "same-day core activity must remain active");

  await setActor(ids.transactionUser);
  await db.exec("SET ROLE authenticated");
  await expectFailure(
    () => db.query("SELECT public.get_admin_feedback_intelligence_insights('production')"),
    "admin_role_required",
  );
  await db.exec("RESET ROLE");
  await db.query("SELECT set_config('request.jwt.claim.role', 'admin', false)");
  await db.exec("SET ROLE authenticated");
  const suppressedAdminAggregate = await db.query(
    "SELECT public.get_admin_feedback_intelligence_insights('production') AS result",
  );
  assert(
    suppressedAdminAggregate.rows[0].result.summary.participants === 1
      && suppressedAdminAggregate.rows[0].result.summary.sufficient_data === false,
    "admin aggregate must report insufficient data below five participants",
  );
  assert(
    suppressedAdminAggregate.rows[0].result.questions[0].option_distribution.length === 0,
    "option distributions must be suppressed below five participants",
  );
  await expectFailure(
    () => db.query("SELECT public.get_admin_feedback_intelligence_insights('mixed')"),
    "feedback_admin_data_scope_invalid",
  );
  await db.exec("RESET ROLE");

  for (const [index, aggregateUser] of aggregateUsers.entries()) {
    await db.query("INSERT INTO auth.users(id) VALUES ($1)", [aggregateUser.user]);
    await db.query("INSERT INTO public.profiles(id, is_test_user) VALUES ($1, false)", [aggregateUser.user]);
    await db.query(`
      INSERT INTO public.program_instances(id, user_id, status, started_at, is_test_instance)
      VALUES ($1, $2, 'completed', current_date - 9, false)
    `, [aggregateUser.instance, aggregateUser.user]);
    const aggregateSubject = await db.query(`
      INSERT INTO feedback_core.subject_links(user_id, program_instance_id)
      VALUES ($1, $2)
      RETURNING subject_reference
    `, [aggregateUser.user, aggregateUser.instance]);
    const aggregateSubmission = await db.query(`
      INSERT INTO feedback_core.submissions(
        client_submission_id, campaign_id, user_id, subject_reference,
        program_instance_id, questionnaire_version, language, product_version,
        content_version, program_day, jurisdiction_at_submit, age_band_at_submit,
        product_authorization_basis, status
      ) VALUES (
        $1, $2, $3, $4, $5, 'feedback-d10-v1.1.0', 'de', '1.1.0+5',
        'feedback-intelligence-content-v1.1.0', 10, 'DE', 'adult',
        'adult_or_not_required', 'draft'
      ) RETURNING id
    `, [
      aggregateUser.client,
      campaignId,
      aggregateUser.user,
      aggregateSubject.rows[0].subject_reference,
      aggregateUser.instance,
    ]);
    await db.query(`
      INSERT INTO feedback_core.structured_answers(
        submission_id, question_definition_id, selected_option_ids
      ) VALUES ($1, $2, '["2"]'::jsonb)
    `, [aggregateSubmission.rows[0].id, questionDefinition.rows[0].id]);
    await db.query(`
      INSERT INTO feedback_core.activity_snapshots(
        submission_id, observation_end_program_day, program_days_available,
        program_days_completed, checkins_completed, journal_entries_created_count,
        tasks_completed, transfer_pulse_count, resume_delay_bucket,
        continuation_status_bucket
      ) VALUES ($1, 10, 10, $2, $2, $2, $2, NULL,
        'NO_RESUME_NEEDED', 'ACTIVE_OR_COMPLETED')
    `, [aggregateSubmission.rows[0].id, index + 3]);
    await db.query(`
      UPDATE feedback_core.submissions
      SET status = 'submitted', submitted_at = now()
      WHERE id = $1
    `, [aggregateSubmission.rows[0].id]);
  }

  await db.exec("SET ROLE authenticated");
  const visibleAdminAggregate = await db.query(
    "SELECT public.get_admin_feedback_intelligence_insights('production') AS result",
  );
  const aggregatePayload = visibleAdminAggregate.rows[0].result;
  const clarityAggregate = aggregatePayload.questions.find(
    (question) => question.question_id === "d10_content_clarity",
  );
  assert(
    aggregatePayload.summary.participants === 5
      && aggregatePayload.summary.sufficient_data === true,
    "five distinct participants must unlock fixed admin aggregates",
  );
  assert(
    clarityAggregate.option_distribution.length === 1
      && clarityAggregate.option_distribution[0].option_id === "2"
      && clarityAggregate.option_distribution[0].participants === 5,
    "question aggregate must expose only the thresholded option distribution",
  );
  assert(
    aggregatePayload.activity_associations.length === 1
      && aggregatePayload.activity_associations[0].participants === 5
      && aggregatePayload.activity_associations[0].interpretation === "OBSERVATIONAL_NOT_CAUSAL",
    "activity associations must require five participants and carry the claim boundary",
  );
  const syntheticAdminAggregate = await db.query(
    "SELECT public.get_admin_feedback_intelligence_insights('synthetic') AS result",
  );
  assert(
    syntheticAdminAggregate.rows[0].result.summary.participants === 5
      && syntheticAdminAggregate.rows[0].result.summary.participants
        !== visibleAdminAggregate.rows[0].result.summary.participants + 5,
    "synthetic scope must contain only the five fully synthetic participants",
  );
  await db.exec("RESET ROLE");

  await db.exec("SET ROLE service_role");
  await expectFailure(
    () => db.query("SELECT public.get_admin_feedback_intelligence_insights('production')"),
    "permission denied",
  );
  await db.exec("RESET ROLE");

  const transactionSubject = await db.query(`
    SELECT subject_reference
    FROM feedback_core.subject_links
    WHERE user_id = $1 AND program_instance_id = $2
  `, [ids.transactionUser, ids.transactionInstance]);
  await db.query(`
    INSERT INTO public.program_instances(id, user_id, status, started_at)
    VALUES ('10000000-0000-4000-8000-000000001104', $1, 'completed', current_date)
  `, [ids.transactionUser]);
  const rotatedSubject = await db.query(`
    INSERT INTO feedback_core.subject_links(user_id, program_instance_id)
    VALUES ($1, '10000000-0000-4000-8000-000000001104')
    RETURNING subject_reference
  `, [ids.transactionUser]);
  assert(
    rotatedSubject.rows[0].subject_reference !== transactionSubject.rows[0].subject_reference,
    "a new program instance must rotate the pseudonymous subject reference",
  );

  await db.query("DELETE FROM auth.users WHERE id = $1", [ids.user]);
  await db.query("DELETE FROM auth.users WHERE id = $1", [ids.minor]);
  await db.query("DELETE FROM auth.users WHERE id = $1", [ids.transactionUser]);
  for (const aggregateUser of aggregateUsers) {
    await db.query("DELETE FROM auth.users WHERE id = $1", [aggregateUser.user]);
  }
  for (const machineUser of machineUsers) {
    await db.query("DELETE FROM auth.users WHERE id = $1", [machineUser.user]);
  }

  for (const table of [
    "feedback_core.subject_links",
    "feedback_core.submissions",
    "feedback_core.structured_answers",
    "feedback_core.activity_snapshots",
    "feedback_consent.text_consent_receipts",
    "feedback_raw.comments",
    "feedback_analysis.comment_artifacts",
  ]) {
    const count = await db.query(`SELECT COUNT(*)::integer AS count FROM ${table}`);
    assert(count.rows[0].count === 0, `${table} must cascade on account deletion`);
  }

  const campaignCount = await db.query(
    "SELECT COUNT(*)::integer AS count FROM feedback_core.campaigns",
  );
  assert(campaignCount.rows[0].count === 4, "versioned campaign definitions must survive account deletion");

  console.log("Feedback Intelligence SQL foundation checks passed.");
} finally {
  await db.close();
}
