import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const migration = readFileSync(
  resolve("supabase/migrations/20260810091629_organization_inquiry_retention_v1_1.sql"),
  "utf8",
);

const ids = {
  admin: "00000000-0000-4000-8000-000000000001",
  outsider: "00000000-0000-4000-8000-000000000002",
  expiredDeclined: "10000000-0000-4000-8000-000000000001",
  recentDeclined: "10000000-0000-4000-8000-000000000002",
  expiredWithdrawn: "10000000-0000-4000-8000-000000000003",
  approved: "10000000-0000-4000-8000-000000000004",
  submitted: "10000000-0000-4000-8000-000000000005",
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

const db = new PGlite();

const setActor = async (userId) => {
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [userId]);
};

try {
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE SCHEMA app_private;
    CREATE SCHEMA cron;

    CREATE FUNCTION auth.uid()
    RETURNS uuid
    LANGUAGE sql
    STABLE
    AS $$
      SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;

    CREATE FUNCTION app_private.is_admin(_user_id uuid)
    RETURNS boolean
    LANGUAGE sql
    STABLE
    AS $$
      SELECT _user_id = '${ids.admin}'::uuid
    $$;

    CREATE FUNCTION cron.schedule(_name text, _schedule text, _command text)
    RETURNS bigint
    LANGUAGE sql
    AS $$ SELECT 1::bigint $$;

    CREATE TABLE public.organization_access_requests (
      id uuid PRIMARY KEY,
      reference_code text NOT NULL UNIQUE,
      status text NOT NULL,
      updated_at timestamptz NOT NULL
    );

    CREATE TABLE public.organization_access_request_events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      request_id uuid NOT NULL REFERENCES public.organization_access_requests(id) ON DELETE CASCADE
    );
  `);
  await db.exec(migration);

  await db.query(`
    INSERT INTO public.organization_access_requests(id, reference_code, status, updated_at)
    VALUES
      ($1, 'RP-EXPIRED-D', 'declined', now() - interval '366 days'),
      ($2, 'RP-RECENT-D', 'declined', now() - interval '364 days'),
      ($3, 'RP-EXPIRED-W', 'withdrawn', now() - interval '500 days'),
      ($4, 'RP-APPROVED', 'approved_partner', now() - interval '500 days'),
      ($5, 'RP-SUBMITTED', 'submitted', now() - interval '500 days')
  `, [ids.expiredDeclined, ids.recentDeclined, ids.expiredWithdrawn, ids.approved, ids.submitted]);
  await db.query(`
    INSERT INTO public.organization_access_request_events(request_id)
    SELECT id FROM public.organization_access_requests
  `);

  const cleanup = await db.query(
    "SELECT app_private.cleanup_expired_organization_access_requests() AS deleted",
  );
  assert(cleanup.rows[0]?.deleted === 2, "retention must delete exactly two expired terminal requests");

  const remaining = await db.query(
    "SELECT reference_code FROM public.organization_access_requests ORDER BY reference_code",
  );
  assert(
    JSON.stringify(remaining.rows.map((row) => row.reference_code))
      === JSON.stringify(["RP-APPROVED", "RP-RECENT-D", "RP-SUBMITTED"]),
    "retention must preserve recent, approved and open requests",
  );
  const remainingEvents = await db.query(
    "SELECT count(*)::integer AS count FROM public.organization_access_request_events",
  );
  assert(remainingEvents.rows[0]?.count === 3, "expired request events must cascade-delete");

  await setActor(ids.outsider);
  await expectFailure(
    () => db.query(
      "SELECT public.delete_organization_access_request_spam($1, 'DELETE_FAKE_OR_SPAM')",
      [ids.submitted],
    ),
    "admin_required",
  );

  await setActor(ids.admin);
  await expectFailure(
    () => db.query(
      "SELECT public.delete_organization_access_request_spam($1, 'delete')",
      [ids.submitted],
    ),
    "exact_confirmation_required",
  );
  await expectFailure(
    () => db.query(
      "SELECT public.delete_organization_access_request_spam($1, 'DELETE_FAKE_OR_SPAM')",
      [ids.approved],
    ),
    "active_or_approved_request_cannot_be_purged",
  );

  const purge = await db.query(
    "SELECT public.delete_organization_access_request_spam($1, 'DELETE_FAKE_OR_SPAM') AS result",
    [ids.submitted],
  );
  assert(purge.rows[0]?.result?.success === true, "admin fake/spam purge must succeed");
  assert(purge.rows[0]?.result?.reason === "fake_or_spam", "purge receipt must preserve its exact reason");

  const deletedRequest = await db.query(
    "SELECT count(*)::integer AS count FROM public.organization_access_requests WHERE id = $1",
    [ids.submitted],
  );
  const deletedEvents = await db.query(
    "SELECT count(*)::integer AS count FROM public.organization_access_request_events WHERE request_id = $1",
    [ids.submitted],
  );
  assert(deletedRequest.rows[0]?.count === 0, "fake/spam request must be permanently deleted");
  assert(deletedEvents.rows[0]?.count === 0, "fake/spam request events must cascade-delete");

  process.stdout.write(
    "Organization inquiry retention SQL verified: 365-day terminal cleanup, admin-only exact-confirmation spam purge, cascade deletion and active-partnership protection.\n",
  );
} finally {
  await db.close();
}
