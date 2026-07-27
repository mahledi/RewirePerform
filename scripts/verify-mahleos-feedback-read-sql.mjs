import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import Ajv2020 from "ajv/dist/2020.js";

const db = new PGlite();
const baseMigration = readFileSync(
  resolve("supabase/migrations/20260723154047_mahleos_feedback_read_contract_v1.sql"),
  "utf8",
);
const hardeningMigration = readFileSync(
  resolve("supabase/migrations/20260723165153_harden_mahleos_feedback_and_telemetry_v1.sql"),
  "utf8",
);
const migration = `${baseMigration}\n${hardeningMigration}`;
const sharedFeedbackLock = [
  "pg_catalog.pg_advisory_xact_lock(",
  "    pg_catalog.hashtextextended('mahleos-feedback-read:' || _client_id, 0)",
  "  )",
].join("\n");
const successSchema = JSON.parse(readFileSync(
  resolve("docs/mahleos-handoff/feedback-contract/v1/schemas/feedback-read-success.schema.json"),
  "utf8",
));
const validateSuccess = new Ajv2020({ allErrors: true, strict: true }).compile(successSchema);

const ids = {
  productionUser: "10000000-0000-4000-8000-000000000701",
  testUser: "10000000-0000-4000-8000-000000000702",
  productionFeedbackNewest: "20000000-0000-4000-8000-000000000701",
  productionFeedbackOlder: "20000000-0000-4000-8000-000000000702",
  testFeedback: "20000000-0000-4000-8000-000000000703",
  request: "90000000-0000-4000-8000-000000000701",
  pageRequest: "90000000-0000-4000-8000-000000000702",
  rateRequest: "90000000-0000-4000-8000-000000000703",
  repeatedRateRequest: "90000000-0000-4000-8000-000000000704",
  canonicalFeedback: "20000000-0000-4000-8000-000000000704",
  invalidVersionFeedback: "20000000-0000-4000-8000-000000000705",
  canonicalEvent: "30000000-0000-4000-8000-000000000701",
  team: "40000000-0000-4000-8000-000000000701",
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const expectFailure = async (task, expectedMessage) => {
  try {
    await task();
  } catch (error) {
    assert(
      String(error).includes(expectedMessage),
      `Expected ${expectedMessage}, received ${String(error)}`,
    );
    return;
  }
  throw new Error(`Expected failure containing ${expectedMessage}`);
};

const asObject = (value) => typeof value === "string" ? JSON.parse(value) : value;

const readFeedbackAsService = async ({
  requestId,
  cursorCreatedAt = null,
  cursorId = null,
  limit = 25,
  clientId = "mahleos-feedback-v1",
}) => {
  await db.exec("SET ROLE service_role");
  try {
    const result = await db.query(
      `SELECT public.read_mahleos_feedback_page($1, $2, $3, $4, $5) AS response`,
      [requestId, clientId, cursorCreatedAt, cursorId, limit],
    );
    return asObject(result.rows[0].response);
  } finally {
    await db.exec("RESET ROLE");
  }
};

const auditInvalidRequestAsService = async ({
  requestId,
  errorCode = "invalid_schema",
}) => {
  await db.exec("SET ROLE service_role");
  try {
    const result = await db.query(
      `SELECT public.audit_mahleos_feedback_invalid_request($1, $2, $3) AS response`,
      [requestId, "mahleos-feedback-v1", errorCode],
    );
    return asObject(result.rows[0].response);
  } finally {
    await db.exec("RESET ROLE");
  }
};

try {
  assert(
    hardeningMigration.split(sharedFeedbackLock).length - 1 === 2,
    "Both feedback RPCs must use the exact same 64-bit advisory lock key",
  );
  assert(
    !hardeningMigration.includes("pg_advisory_xact_lock(hashtext('mahleos-feedback-read:"),
    "No feedback RPC may retain the divergent 32-bit advisory lock key",
  );

  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE SCHEMA extensions;

    CREATE FUNCTION auth.uid()
    RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;

    CREATE FUNCTION extensions.digest(_value bytea, _algorithm text)
    RETURNS bytea LANGUAGE sql IMMUTABLE AS $$
      SELECT decode(md5(_value), 'hex')
        || decode(md5(_value || convert_to(_algorithm, 'UTF8')), 'hex')
    $$;

    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE TABLE public.profiles(
      id uuid PRIMARY KEY REFERENCES auth.users(id),
      is_test_user boolean NOT NULL DEFAULT false
    );
    CREATE TABLE public.user_roles(
      user_id uuid NOT NULL REFERENCES auth.users(id),
      role text NOT NULL
    );
    CREATE TABLE public.teams(
      id uuid PRIMARY KEY,
      created_by uuid REFERENCES auth.users(id)
    );
    CREATE TABLE public.team_members(
      team_id uuid NOT NULL REFERENCES public.teams(id),
      user_id uuid NOT NULL REFERENCES auth.users(id)
    );
    CREATE TABLE public.feedback(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES auth.users(id),
      type text NOT NULL DEFAULT 'general',
      message text NOT NULL,
      status text NOT NULL DEFAULT 'open',
      admin_note text,
      reviewed_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE public.app_event_log(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at timestamptz NOT NULL DEFAULT now(),
      user_id uuid REFERENCES auth.users(id),
      role text,
      team_id uuid REFERENCES public.teams(id),
      event_name text NOT NULL,
      status text NOT NULL DEFAULT 'success',
      route text,
      error_code text,
      is_test boolean NOT NULL DEFAULT false,
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb
    );
  `);

  await db.exec(migration);

  const privileges = await db.query(`
    SELECT
      has_function_privilege(
        'service_role',
        'public.read_mahleos_feedback_page(uuid,text,timestamptz,uuid,integer)',
        'EXECUTE'
      ) AS service_can_read,
      has_function_privilege(
        'authenticated',
        'public.read_mahleos_feedback_page(uuid,text,timestamptz,uuid,integer)',
        'EXECUTE'
      ) AS authenticated_can_read,
      has_function_privilege(
        'anon',
        'public.read_mahleos_feedback_page(uuid,text,timestamptz,uuid,integer)',
        'EXECUTE'
      ) AS anon_can_read,
      has_function_privilege(
        'service_role',
        'public.audit_mahleos_feedback_invalid_request(uuid,text,text)',
        'EXECUTE'
      ) AS service_can_audit_invalid,
      has_function_privilege(
        'authenticated',
        'public.audit_mahleos_feedback_invalid_request(uuid,text,text)',
        'EXECUTE'
      ) AS authenticated_can_audit_invalid,
      has_function_privilege(
        'anon',
        'public.audit_mahleos_feedback_invalid_request(uuid,text,text)',
        'EXECUTE'
      ) AS anon_can_audit_invalid
  `);
  assert(privileges.rows[0].service_can_read === true, "service_role must read feedback");
  assert(privileges.rows[0].authenticated_can_read === false, "authenticated must not read feedback");
  assert(privileges.rows[0].anon_can_read === false, "anon must not read feedback");
  assert(privileges.rows[0].service_can_audit_invalid === true, "service_role must audit invalid requests");
  assert(
    privileges.rows[0].authenticated_can_audit_invalid === false,
    "authenticated must not call the invalid-request audit",
  );
  assert(
    privileges.rows[0].anon_can_audit_invalid === false,
    "anon must not call the invalid-request audit",
  );

  await db.query(
    "INSERT INTO auth.users(id) VALUES ($1), ($2)",
    [ids.productionUser, ids.testUser],
  );
  await db.query(
    "INSERT INTO public.profiles(id, is_test_user) VALUES ($1, false), ($2, true)",
    [ids.productionUser, ids.testUser],
  );
  await db.query(
    "INSERT INTO public.user_roles(user_id, role) VALUES ($1, 'athlete')",
    [ids.productionUser],
  );
  await db.query(
    "INSERT INTO public.teams(id, created_by) VALUES ($1, $2)",
    [ids.team, ids.productionUser],
  );

  const context = {
    schema_version: "feedback-technical-context-v1",
    runtime: "native",
    platform: "ios",
    route: "/settings",
    online: true,
    app_version: "1.0.0",
  };
  await db.query(
    `INSERT INTO public.feedback(
      id, user_id, type, message, status, created_at, technical_context
    ) VALUES
      ($1, $2, 'bug', 'Neuer Produktionshinweis', 'open', '2026-07-23T15:30:00Z', $6),
      ($3, $2, 'suggestion', 'Aelterer Produktionshinweis', 'reviewed', '2026-07-23T14:30:00Z', $6),
      ($4, $5, 'bug', 'QA-MUST-NOT-LEAVE', 'open', '2026-07-23T16:30:00Z', $6)`,
    [
      ids.productionFeedbackNewest,
      ids.productionUser,
      ids.productionFeedbackOlder,
      ids.testFeedback,
      ids.testUser,
      JSON.stringify(context),
    ],
  );

  const firstPage = await readFeedbackAsService({
    requestId: ids.request,
    limit: 1,
  });
  const edgeProjectionShape = {
    ...firstPage,
    next_cursor: "synthetic-cursor",
  };
  delete edgeProjectionShape.next_cursor_created_at;
  delete edgeProjectionShape.next_cursor_id;
  assert(
    validateSuccess(edgeProjectionShape),
    `Feedback response must match contract: ${JSON.stringify(validateSuccess.errors)}`,
  );
  assert(firstPage.items.length === 1, "Requested page size must be enforced");
  assert(firstPage.has_more === true, "A second production item must create a cursor");
  assert(
    firstPage.items[0].message === "Neuer Produktionshinweis",
    "Newest production feedback must be first",
  );
  const serialized = JSON.stringify(firstPage);
  assert(!serialized.includes(ids.productionUser), "User IDs must never leave the database contract");
  assert(!serialized.includes("QA-MUST-NOT-LEAVE"), "Test feedback must remain excluded");
  assert(!serialized.includes('"admin_note":'), "Admin notes must remain excluded");
  assert(
    firstPage.schema_version === "mahleos-feedback-read-v1.1",
    "The hardened response version must be explicit",
  );
  assert(
    firstPage.privacy.structured_user_identifiers_exported === false
      && firstPage.privacy.recognized_direct_identifiers_redacted === true
      && firstPage.privacy.free_text_may_contain_personal_data === true,
    "Privacy metadata must be conservative and explicit",
  );

  const secondPage = await readFeedbackAsService({
    requestId: ids.pageRequest,
    cursorCreatedAt: firstPage.next_cursor_created_at,
    cursorId: firstPage.next_cursor_id,
    limit: 1,
  });
  assert(secondPage.items.length === 1, "Cursor must expose the next production item");
  assert(secondPage.has_more === false, "Second page must finish this synthetic data set");
  assert(
    secondPage.items[0].message === "Aelterer Produktionshinweis",
    "Cursor ordering must be stable",
  );

  await expectFailure(
    () => db.query(
      `INSERT INTO public.feedback(
        user_id, message, technical_context
      ) VALUES ($1, 'unsafe context', $2)`,
      [
        ids.productionUser,
        JSON.stringify({ ...context, email: "private@example.com" }),
      ],
    ),
    "feedback_technical_context_contract_v1",
  );

  await db.query(
    "SELECT set_config('request.jwt.claim.sub', $1, false)",
    [ids.productionUser],
  );
  await db.query(
    `INSERT INTO public.feedback(
      id, user_id, type, message, status, created_at, admin_note, reviewed_at, technical_context
    ) VALUES (
      $1,
      $2,
      'not-a-category',
      'Kontakt: private@example.com oder +49 170 1234567',
      'resolved',
      '2020-01-01T00:00:00Z',
      'must disappear',
      now(),
      $3
    )`,
    [
      ids.canonicalFeedback,
      ids.testUser,
      JSON.stringify({
        ...context,
        route: "/admin/private",
        app_version: "1.2.3+45",
      }),
    ],
  );
  const canonicalFeedback = await db.query(
    `SELECT id, user_id, type, message, status, admin_note, reviewed_at,
            technical_context, created_at
     FROM public.feedback
     WHERE message LIKE 'Kontakt:%'`,
  );
  const canonicalRow = canonicalFeedback.rows[0];
  assert(canonicalRow.id !== ids.canonicalFeedback, "Client feedback ID must be replaced");
  assert(canonicalRow.user_id === ids.productionUser, "Feedback owner must come from auth.uid()");
  assert(canonicalRow.type === "general", "Unknown categories must be canonicalized");
  assert(canonicalRow.status === "open", "Client moderation state must be ignored");
  assert(canonicalRow.admin_note === null, "Client admin notes must be cleared");
  assert(canonicalRow.reviewed_at === null, "Client review timestamp must be cleared");
  assert(canonicalRow.technical_context.route === "/settings", "Feedback route must be fixed");
  assert(
    canonicalRow.technical_context.app_version === "1.2.3+45",
    "A bounded client release label must remain available for non-authoritative triage",
  );
  assert(
    new Date(canonicalRow.created_at).getTime() > new Date("2026-01-01T00:00:00Z").getTime(),
    "Client timestamps must be replaced",
  );

  await db.query(
    `INSERT INTO public.feedback(
      id, user_id, message, technical_context
    ) VALUES ($1, $2, 'ungueltige Versionsangabe', $3)`,
    [
      ids.invalidVersionFeedback,
      ids.productionUser,
      JSON.stringify({
        ...context,
        app_version: "1.2.3-private-user",
      }),
    ],
  );
  const invalidVersionFeedback = await db.query(
    "SELECT technical_context FROM public.feedback WHERE message = 'ungueltige Versionsangabe'",
  );
  assert(
    invalidVersionFeedback.rows[0].technical_context.app_version === "unknown",
    "An invalid or identifier-like client release label must become unknown",
  );

  await db.query(
    `INSERT INTO public.app_event_log(
      id, created_at, user_id, role, team_id, event_name, status,
      route, error_code, is_test, metadata
    ) VALUES (
      $1,
      '2020-01-01T00:00:00Z',
      $2,
      'admin',
      $3,
      'daily_checkin_saved',
      'failed',
      '/private?token=secret',
      'unsafe error value',
      true,
      $4
    )`,
    [
      ids.canonicalEvent,
      ids.testUser,
      ids.team,
      JSON.stringify({
        day_number: 7,
        stage: "daily_checkin",
        email: "private@example.com",
        source: "unsafe source with spaces",
      }),
    ],
  );
  const canonicalEvent = await db.query(
    `SELECT id, user_id, role, team_id, route, error_code, is_test, metadata, created_at
     FROM public.app_event_log
     WHERE event_name = 'daily_checkin_saved'`,
  );
  const eventRow = canonicalEvent.rows[0];
  assert(eventRow.id !== ids.canonicalEvent, "Client event ID must be replaced");
  assert(eventRow.user_id === ids.productionUser, "Event owner must come from auth.uid()");
  assert(eventRow.role === "athlete", "Event role must be derived server-side");
  assert(eventRow.team_id === ids.team, "Valid team membership/ownership must be retained");
  assert(eventRow.route === null, "Unknown routes must be removed");
  assert(eventRow.error_code === null, "Unsafe error codes must be removed");
  assert(eventRow.is_test === false, "Test status must be derived from the profile");
  assert(
    eventRow.metadata.day_number === 7
      && eventRow.metadata.stage === "daily_checkin"
      && eventRow.metadata.source_authority === "client_reported_non_authoritative"
      && Object.keys(eventRow.metadata).length === 3,
    "Only safe telemetry metadata may remain",
  );

  await expectFailure(
    () => db.query(
      `INSERT INTO public.app_event_log(event_name, status)
       VALUES ('invented_event', 'failed')`,
    ),
    "app_event_name_invalid",
  );

  await db.exec(`
    INSERT INTO public.app_event_log(event_name, status, metadata)
    SELECT 'app_runtime_error', 'success', '{}'::jsonb
    FROM generate_series(1, 59);
  `);
  await expectFailure(
    () => db.query(
      `INSERT INTO public.app_event_log(event_name, status)
       VALUES ('app_runtime_error', 'failed')`,
    ),
    "app_event_rate_limited",
  );
  await db.exec("SELECT set_config('request.jwt.claim.sub', '', false)");

  const redacted = await db.query(
    `SELECT public.redact_mahleos_feedback_text(
      'Mail private@example.com, Tel +49 170 1234567, Token Bearer abcdefghijklmnopqrstuvwxyz123456'
    ) AS value`,
  );
  assert(!redacted.rows[0].value.includes("private@example.com"), "Email must be redacted");
  assert(!redacted.rows[0].value.includes("+49 170 1234567"), "Phone must be redacted");
  assert(!redacted.rows[0].value.includes("abcdefghijklmnopqrstuvwxyz"), "Token must be redacted");

  await expectFailure(
    () => db.query(
      "UPDATE public.mahleos_feedback_access_log SET outcome = 'success' WHERE request_id = $1",
      [ids.request],
    ),
    "mahleos_feedback_access_log is append-only",
  );

  const forbiddenColumns = await db.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'mahleos_feedback_access_log'
      AND column_name IN ('message', 'payload', 'raw_body', 'response_payload', 'user_id', 'email')
  `);
  assert(forbiddenColumns.rows.length === 0, "Audit log must not store feedback or identity");

  const auditBeforeInvalidSchema = await db.query(`
    SELECT COUNT(*)::integer AS count
    FROM public.mahleos_feedback_access_log
    WHERE outcome = 'invalid_request'
      AND request_error_code = 'invalid_schema'
  `);
  const nullLimit = await db.query(
    `SELECT public.read_mahleos_feedback_page($1, $2, NULL, NULL, NULL) AS response`,
    ["90000000-0000-4000-8000-000000000705", "mahleos-feedback-v1"],
  );
  const nullLimitResponse = asObject(nullLimit.rows[0].response);
  assert(
    nullLimitResponse.ok === false && nullLimitResponse.error === "invalid_request",
    "A null page limit must fail closed",
  );
  const auditAfterInvalidSchema = await db.query(`
    SELECT COUNT(*)::integer AS count
    FROM public.mahleos_feedback_access_log
    WHERE outcome = 'invalid_request'
      AND request_error_code = 'invalid_schema'
  `);
  assert(
    auditAfterInvalidSchema.rows[0].count === auditBeforeInvalidSchema.rows[0].count + 1,
    "A service-authenticated invalid schema must leave a generic audit row",
  );

  const auditBeforeUnknownError = await db.query(
    "SELECT COUNT(*)::integer AS count FROM public.mahleos_feedback_access_log",
  );
  const rejectedUnknownError = await auditInvalidRequestAsService({
    requestId: "90000000-0000-4000-8000-000000000707",
    errorCode: "private@example.com",
  });
  assert(
    rejectedUnknownError.ok === false && rejectedUnknownError.error === "invalid_request",
    "Unknown audit error codes must fail closed",
  );
  const auditAfterUnknownError = await db.query(
    "SELECT COUNT(*)::integer AS count FROM public.mahleos_feedback_access_log",
  );
  assert(
    auditAfterUnknownError.rows[0].count === auditBeforeUnknownError.rows[0].count,
    "Unknown or identifier-like audit error codes must never be persisted",
  );
  await expectFailure(
    () => db.query(
      `INSERT INTO public.mahleos_feedback_access_log(
        request_id, client_id, outcome, request_error_code
      ) VALUES ($1, 'mahleos-feedback-v1', 'invalid_request', 'private@example.com')`,
      ["90000000-0000-4000-8000-000000000708"],
    ),
    "mahleos_feedback_access_log_request_error_v1_check",
  );

  const currentWindow = await db.query(`
    SELECT COUNT(*)::integer AS count
    FROM public.mahleos_feedback_access_log
    WHERE client_id = 'mahleos-feedback-v1'
      AND requested_at >= now() - interval '1 minute'
  `);
  const invalidRequestsNeeded = 29 - currentWindow.rows[0].count;
  assert(invalidRequestsNeeded >= 1, "The shared-limit fixture must leave room for invalid requests");
  for (let index = 0; index < invalidRequestsNeeded; index += 1) {
    const invalidAudit = await auditInvalidRequestAsService({
      requestId: `91000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
      errorCode: index % 2 === 0 ? "invalid_json" : "request_too_large",
    });
    assert(invalidAudit.ok === true, "Authenticated invalid requests must be audited below the limit");
  }
  const preparedWindow = await db.query(`
    SELECT COUNT(*)::integer AS count
    FROM public.mahleos_feedback_access_log
    WHERE client_id = 'mahleos-feedback-v1'
      AND outcome IN ('success', 'invalid_request')
      AND requested_at >= now() - interval '1 minute'
  `);
  assert(
    preparedWindow.rows[0].count === 29,
    "The controlled parallel test must start with exactly 29 accepted requests",
  );

  let releaseParallelRequests;
  const parallelStart = new Promise((resolveStart) => {
    releaseParallelRequests = resolveStart;
  });
  await db.exec("SET ROLE service_role");
  let parallelResponses;
  try {
    const validRead = parallelStart.then(async () => {
      const result = await db.query(
        `SELECT public.read_mahleos_feedback_page($1, $2, NULL, NULL, $3) AS response`,
        [ids.rateRequest, "mahleos-feedback-v1", 25],
      );
      return asObject(result.rows[0].response);
    });
    const invalidRead = parallelStart.then(async () => {
      const result = await db.query(
        `SELECT public.audit_mahleos_feedback_invalid_request($1, $2, $3) AS response`,
        [ids.repeatedRateRequest, "mahleos-feedback-v1", "unsupported_media_type"],
      );
      return asObject(result.rows[0].response);
    });
    releaseParallelRequests();
    parallelResponses = await Promise.all([validRead, invalidRead]);
  } finally {
    await db.exec("RESET ROLE");
  }

  const acceptedParallelRequests = parallelResponses.filter((response) => response.ok === true);
  const rateLimitedParallelRequests = parallelResponses.filter(
    (response) => response.ok === false && response.error === "rate_limited",
  );
  assert(
    acceptedParallelRequests.length === 1,
    "At 29 requests, at most one parallel valid/invalid request may be accepted",
  );
  assert(
    rateLimitedParallelRequests.length === 1,
    "The other parallel request must be rate limited",
  );
  const acceptedWindowCount = await db.query(`
    SELECT COUNT(*)::integer AS count
    FROM public.mahleos_feedback_access_log
    WHERE client_id = 'mahleos-feedback-v1'
      AND outcome IN ('success', 'invalid_request')
      AND requested_at >= now() - interval '1 minute'
  `);
  assert(
    acceptedWindowCount.rows[0].count <= 30,
    "Parallel valid/invalid requests must never raise accepted requests above 30",
  );
  const rateAuditCount = await db.query(`
    SELECT COUNT(*)::integer AS count
    FROM public.mahleos_feedback_access_log
    WHERE outcome = 'rate_limited'
      AND requested_at >= now() - interval '1 minute'
  `);
  assert(rateAuditCount.rows[0].count <= 1, "Rate-limit audit must be bounded to one row per minute");

  await db.exec(`
    INSERT INTO public.mahleos_feedback_access_log(
      request_id, client_id, outcome, requested_at
    ) VALUES (
      gen_random_uuid(), 'mahleos-feedback-v1', 'success', now() - interval '91 days'
    )
  `);
  await db.exec("SET ROLE service_role");
  const cleanup = await db.query(
    "SELECT public.cleanup_mahleos_feedback_access_log() AS removed",
  );
  await db.exec("RESET ROLE");
  assert(cleanup.rows[0].removed === 1, "Retention must remove only expired audit rows");
  const remainingAudit = await db.query(`
    SELECT COUNT(*)::integer AS count
    FROM public.mahleos_feedback_access_log
    WHERE requested_at < now() - interval '90 days'
  `);
  assert(remainingAudit.rows[0].count === 0, "No expired audit rows may remain");

  console.log(JSON.stringify({
    migrationApplied: true,
    machineRpcServiceOnly: true,
    productionOnly: true,
    stablePagination: true,
    technicalContextAllowlist: true,
    clientInputCanonicalized: true,
    directIdentifiersRedacted: true,
    telemetryCanonicalized: true,
    telemetrySourceNonAuthoritative: true,
    telemetryRateLimitCheck: true,
    feedbackVersionClientReportedNonAuthoritative: true,
    invalidRequestAuditServiceOnly: true,
    invalidRequestAuditNoPayload: true,
    sharedReadAndInvalidRequestRateLimit: true,
    sharedAdvisoryLockKey: true,
    controlledParallelRateLimitCheck: true,
    auditAppendOnly: true,
    auditRetentionBounded: true,
    rateLimitCheck: true,
  }));
} finally {
  await db.close();
}
