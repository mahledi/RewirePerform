import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import Ajv2020 from "ajv/dist/2020.js";

const db = new PGlite();
const migration = readFileSync(
  resolve("supabase/migrations/20260723154047_mahleos_feedback_read_contract_v1.sql"),
  "utf8",
);
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

try {
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE SCHEMA extensions;

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
    CREATE TABLE public.feedback(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES auth.users(id),
      type text NOT NULL DEFAULT 'general',
      message text NOT NULL,
      status text NOT NULL DEFAULT 'open',
      created_at timestamptz NOT NULL DEFAULT now()
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
      ) AS anon_can_read
  `);
  assert(privileges.rows[0].service_can_read === true, "service_role must read feedback");
  assert(privileges.rows[0].authenticated_can_read === false, "authenticated must not read feedback");
  assert(privileges.rows[0].anon_can_read === false, "anon must not read feedback");

  await db.query(
    "INSERT INTO auth.users(id) VALUES ($1), ($2)",
    [ids.productionUser, ids.testUser],
  );
  await db.query(
    "INSERT INTO public.profiles(id, is_test_user) VALUES ($1, false), ($2, true)",
    [ids.productionUser, ids.testUser],
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
      AND column_name IN ('message', 'payload', 'response_payload', 'user_id', 'email')
  `);
  assert(forbiddenColumns.rows.length === 0, "Audit log must not store feedback or identity");

  await db.exec(`
    INSERT INTO public.mahleos_feedback_access_log(
      request_id, client_id, outcome, requested_at
    )
    SELECT gen_random_uuid(), 'mahleos-feedback-v1', 'success', now()
    FROM generate_series(1, 30);
  `);
  const rateLimited = await readFeedbackAsService({
    requestId: ids.rateRequest,
  });
  assert(
    rateLimited.ok === false && rateLimited.error === "rate_limited",
    "The 31st request in one minute must be rate limited",
  );

  console.log(JSON.stringify({
    migrationApplied: true,
    machineRpcServiceOnly: true,
    productionOnly: true,
    stablePagination: true,
    technicalContextAllowlist: true,
    auditAppendOnly: true,
    rateLimitCheck: true,
  }));
} finally {
  await db.close();
}
