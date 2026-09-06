import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();

const ids = {
  admin: "00000000-0000-4000-8000-000000000801",
  outsider: "00000000-0000-4000-8000-000000000802",
  testUser: "00000000-0000-4000-8000-000000000809",
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

const setActor = async (userId) => {
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [userId]);
};

const insight = async (includeTest = false) => {
  const result = await db.query(
    "SELECT public.get_admin_comprehension_insights($1) AS payload",
    [includeTest],
  );
  return result.rows[0].payload;
};

const addCheck = async ({ userId, isTest = false, correct = false, suffix }) => {
  await db.query(
    "INSERT INTO public.profiles(id, is_test_user) VALUES ($1, $2)",
    [userId, isTest],
  );
  await db.query(
    `INSERT INTO public.comprehension_check_instances(
       assignment_id,
       user_id,
       day_number,
       generated_questions,
       results,
       correct_count,
       total_count,
       status,
       completed_at
     )
     VALUES (
       $1,
       $2,
       8,
       $3::jsonb,
       $4::jsonb,
       $5,
       1,
       'completed',
       now()
     )`,
    [
      `10000000-0000-4000-8000-${suffix.padStart(12, "0")}`,
      userId,
      JSON.stringify([
        {
          id: "d8-q1",
          target: "action",
          stem: "Was setzt du nach einem Fehler konkret um?",
          options: [
            { id: "a", text: "Weitergrübeln" },
            { id: "b", text: "Neu ausrichten" },
          ],
          correctOptionId: "b",
          explanation: "Die nächste kontrollierbare Aktion zählt.",
        },
      ]),
      JSON.stringify([
        {
          questionId: "d8-q1",
          selectedOptionId: correct ? "b" : "a",
          isCorrect: correct,
        },
      ]),
      correct ? 1 : 0,
    ],
  );
};

const addUnansweredCheck = async ({ userId, suffix }) => {
  await db.query(
    "INSERT INTO public.profiles(id, is_test_user) VALUES ($1, false)",
    [userId],
  );
  await db.query(
    `INSERT INTO public.comprehension_check_instances(
       assignment_id,
       user_id,
       day_number,
       generated_questions,
       results,
       correct_count,
       total_count,
       status,
       completed_at
     )
     VALUES ($1, $2, 8, $3::jsonb, '[]'::jsonb, 0, 0, 'completed', now())`,
    [
      `10000000-0000-4000-8000-${suffix.padStart(12, "0")}`,
      userId,
      JSON.stringify([
        {
          id: "d8-q1",
          target: "action",
          stem: "Was setzt du nach einem Fehler konkret um?",
        },
      ]),
    ],
  );
};

try {
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role;
    CREATE SCHEMA auth;

    CREATE FUNCTION auth.uid()
    RETURNS uuid
    LANGUAGE sql
    STABLE
    AS $$
      SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;

    CREATE TYPE public.app_role AS ENUM ('athlete', 'coach', 'admin');

    CREATE TABLE public.user_roles (
      user_id uuid NOT NULL,
      role public.app_role NOT NULL,
      UNIQUE (user_id, role)
    );

    CREATE TABLE public.profiles (
      id uuid PRIMARY KEY,
      is_test_user boolean NOT NULL DEFAULT false,
      full_name text,
      email text
    );

    CREATE TABLE public.program_instances (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      is_test_instance boolean NOT NULL DEFAULT false
    );

    CREATE TABLE public.comprehension_check_instances (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      assignment_id uuid NOT NULL UNIQUE,
      user_id uuid NOT NULL,
      day_number integer NOT NULL,
      generated_questions jsonb NOT NULL DEFAULT '[]'::jsonb,
      results jsonb NOT NULL DEFAULT '[]'::jsonb,
      correct_count integer,
      total_count integer,
      status text NOT NULL DEFAULT 'pending',
      created_at timestamptz NOT NULL DEFAULT now(),
      completed_at timestamptz,
      program_instance_id uuid
    );

    CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
    RETURNS boolean
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = pg_catalog
    AS $$
      SELECT EXISTS (
        SELECT 1
        FROM public.user_roles ur
        WHERE ur.user_id = _user_id
          AND ur.role = _role
      )
    $$;

    INSERT INTO public.profiles(id, is_test_user, full_name, email)
    VALUES
      ('${ids.admin}', true, 'Admin Name', 'admin@example.com'),
      ('${ids.outsider}', false, 'Outsider Name', 'outsider@example.com');

    INSERT INTO public.user_roles(user_id, role)
    VALUES ('${ids.admin}', 'admin');
  `);

  const migration = readFileSync(
    resolve("supabase/migrations/20260727121946_admin_comprehension_insights_v1.sql"),
    "utf8",
  );
  await db.exec(migration);

  const grants = await db.query(`
    SELECT
      has_function_privilege('anon', 'public.get_admin_comprehension_insights(boolean)', 'EXECUTE') AS anon_execute,
      has_function_privilege('authenticated', 'public.get_admin_comprehension_insights(boolean)', 'EXECUTE') AS authenticated_execute
  `);
  assert(grants.rows[0].anon_execute === false, "anon must not execute insights");
  assert(grants.rows[0].authenticated_execute === true, "authenticated RPC entry must exist");

  await setActor(ids.outsider);
  await expectFailure(() => insight(false), "admin_role_required");

  await setActor(ids.admin);
  for (let index = 1; index <= 4; index += 1) {
    await addCheck({
      userId: `20000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
      correct: index === 1,
      suffix: String(index),
    });
  }

  const belowFive = await insight(false);
  assert(belowFive.summary.participants === 4, "production participant count mismatch");
  assert(belowFive.summary.accuracy === null, "score must be suppressed below n=5");
  assert(belowFive.questions[0].accuracy === null, "question score must be suppressed below n=5");

  await addCheck({
    userId: ids.testUser,
    isTest: true,
    correct: false,
    suffix: "9",
  });
  const productionStillFour = await insight(false);
  assert(productionStillFour.summary.participants === 4, "test user polluted production insights");

  const qaIncluded = await insight(true);
  assert(qaIncluded.summary.participants === 5, "include_test did not include the QA user");
  assert(qaIncluded.summary.accuracy === 0.2, "visible five-user score is incorrect");
  assert(
    qaIncluded.questions[0].needs_content_review === true,
    "low comprehension content signal not flagged",
  );

  await addCheck({
    userId: "20000000-0000-4000-8000-000000000005",
    correct: true,
    suffix: "5",
  });
  const productionFive = await insight(false);
  assert(productionFive.summary.participants === 5, "fifth production user missing");
  assert(productionFive.summary.accuracy === 0.4, "production aggregate is incorrect");
  assert(productionFive.weeks[0].week_number === 2, "day-to-week mapping is incorrect");
  assert(productionFive.days[0].day_number === 8, "day rollup is incorrect");

  await addUnansweredCheck({
    userId: "20000000-0000-4000-8000-000000000006",
    suffix: "6",
  });
  const unansweredExcluded = await insight(false);
  assert(
    unansweredExcluded.summary.participants === 5,
    "unanswered generated question must not count as a participant response",
  );
  assert(
    unansweredExcluded.summary.question_responses === 5,
    "unanswered generated question must not count as an incorrect response",
  );
  assert(unansweredExcluded.summary.accuracy === 0.4, "unanswered question changed accuracy");

  const serialized = JSON.stringify(unansweredExcluded);
  for (const forbidden of [
    "Admin Name",
    "admin@example.com",
    "Outsider Name",
    "outsider@example.com",
    '"selectedOptionId":',
    '"free_reflection":',
    '"journal_text":',
    '"user_id":',
  ]) {
    assert(!serialized.includes(forbidden), `private field leaked: ${forbidden}`);
  }

  assert(
    productionFive.privacy.journal_or_reflection_text_included === false,
    "privacy contract must exclude private text",
  );

  console.log(
    "Admin comprehension SQL verified: admin-only, test isolation, n<5 suppression, weekly/day/question aggregates and no private text.",
  );
} finally {
  await db.close();
}
