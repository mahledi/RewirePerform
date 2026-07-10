import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NLZ_QA_SUPABASE_URL;
const anonKey = process.env.NLZ_QA_ANON_KEY;
const serviceKey = process.env.NLZ_QA_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  throw new Error(
    "NLZ_QA_SUPABASE_URL, NLZ_QA_ANON_KEY and NLZ_QA_SERVICE_ROLE_KEY are required",
  );
}

const clientOptions = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
};
const service = createClient(url, serviceKey, clientOptions);
const prefix = `nlzqa-${Date.now()}`;
const privateMarker = `NLZ_QA_PRIVATE_REFLECTION_${randomUUID()}`;
const password = `QA-${randomUUID()}-aA1!`;
const createdUserIds = [];
const passed = [];
let teamId = null;
let runId = null;

function assertCheck(name, condition) {
  if (!condition) throw new Error(`FAIL ${name}`);
  passed.push(`PASS ${name}`);
}

async function requireData(label, request) {
  const { data, error } = await request;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

async function requireCount(label, request) {
  const { count, error } = await request;
  if (error) throw new Error(`${label}: ${error.message}`);
  return count;
}

async function createTestUser(label, role) {
  const email = `${prefix}-${label}@example.invalid`;
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `QA ${label}` },
  });
  if (error) throw new Error(`create ${label}: ${error.message}`);

  const id = data.user.id;
  createdUserIds.push(id);
  await requireData(
    `delete default role ${label}`,
    service.from("user_roles").delete().eq("user_id", id),
  );
  await requireData(
    `insert role ${label}`,
    service.from("user_roles").insert({ user_id: id, role }),
  );
  await requireData(
    `update profile ${label}`,
    service
      .from("profiles")
      .update({
        full_name: `QA ${label}`,
        is_test_user: true,
        data_contribution_consent: role === "athlete",
        data_contribution_consent_version: "nlz-qa-v1",
        data_contribution_consented_at:
          role === "athlete" ? new Date().toISOString() : null,
        data_contribution_updated_at: new Date().toISOString(),
      })
      .eq("id", id),
  );

  const client = createClient(url, anonKey, clientOptions);
  const login = await client.auth.signInWithPassword({ email, password });
  if (login.error) throw new Error(`login ${label}: ${login.error.message}`);
  return { id, client };
}

async function cleanup() {
  if (runId) {
    const { data: instances } = await service
      .from("program_instances")
      .select("id")
      .eq("program_run_id", runId);
    const instanceIds = (instances ?? []).map(({ id }) => id);
    if (instanceIds.length) {
      for (const table of [
        "comprehension_check_instances",
        "user_day_completion",
        "daily_checkins",
        "daily_journals",
        "program_progress_snapshots",
        "assessments",
        "deep_profile_assessments",
        "questionnaire_responses",
      ]) {
        await service.from(table).delete().in("program_instance_id", instanceIds);
      }
      await service.from("program_instances").delete().in("id", instanceIds);
    }
    await service.from("study_evidence_snapshots").delete().eq("program_run_id", runId);
    await service.from("program_runs").delete().eq("id", runId);
  }
  if (createdUserIds.length) {
    await service.from("user_day_assignments").delete().in("user_id", createdUserIds);
    await service.from("team_members").delete().in("user_id", createdUserIds);
  }
  if (teamId) await service.from("teams").delete().eq("id", teamId);
  for (const id of [...createdUserIds].reverse()) {
    await service.auth.admin.deleteUser(id);
  }
}

try {
  const coach = await createTestUser("coach", "coach");
  const systemAdmin = await createTestUser("admin", "admin");
  const outsider = await createTestUser("outsider", "athlete");
  const athletes = [];
  for (let index = 1; index <= 5; index += 1) {
    athletes.push(await createTestUser(`athlete${index}`, "athlete"));
  }

  const team = await requireData(
    "create test team",
    service
      .from("teams")
      .insert({
        name: `NLZ QA ${prefix}`,
        sport: "football",
        created_by: coach.id,
        is_test_team: true,
      })
      .select("id")
      .single(),
  );
  teamId = team.id;
  await requireData(
    "assign team members",
    service.from("team_members").insert([
      { team_id: teamId, user_id: coach.id },
      ...athletes.map(({ id }) => ({ team_id: teamId, user_id: id })),
    ]),
  );

  const today = new Date().toISOString().slice(0, 10);
  const run = await requireData(
    "coach creates run",
    coach.client.rpc("create_team_program_run", {
      _team_id: teamId,
      _name: "NLZ QA Run",
      _started_at: today,
    }),
  );
  runId = run.id;
  assertCheck("coach can create run", Boolean(runId) && run.status === "planned");

  const forbiddenCreate = await athletes[0].client.rpc("create_team_program_run", {
    _team_id: teamId,
    _name: "Forbidden athlete run",
    _started_at: today,
  });
  assertCheck("athlete cannot create run", Boolean(forbiddenCreate.error));

  await requireData(
    "activate run",
    coach.client.rpc("activate_team_program_run", { _program_run_id: runId }),
  );
  const assignmentResult = await requireData(
    "assign athletes",
    coach.client.rpc("assign_team_members_to_program_run", {
      _program_run_id: runId,
    }),
  );
  assertCheck("all five athletes assigned", assignmentResult.assigned_athletes === 5);

  const instances = await requireData(
    "load instances",
    service
      .from("program_instances")
      .select("id,user_id,program_run_id,status")
      .eq("program_run_id", runId),
  );
  assertCheck(
    "five unique active instances",
    instances.length === 5 &&
      new Set(instances.map(({ user_id }) => user_id)).size === 5 &&
      instances.every(({ status }) => status === "active"),
  );

  const athleteRunRead = await athletes[0].client
    .from("program_runs")
    .select("id")
    .eq("id", runId);
  assertCheck(
    "team athlete can read own run",
    !athleteRunRead.error && athleteRunRead.data?.length === 1,
  );
  const outsiderRunRead = await outsider.client
    .from("program_runs")
    .select("id")
    .eq("id", runId);
  assertCheck(
    "outsider cannot read run",
    !outsiderRunRead.error && outsiderRunRead.data?.length === 0,
  );

  const directUpdate = await coach.client
    .from("program_runs")
    .update({ name: "Forbidden direct update" })
    .eq("id", runId)
    .select();
  assertCheck(
    "direct run mutation blocked",
    Boolean(directUpdate.error) || directUpdate.data?.length === 0,
  );

  const athleteReadiness = await athletes[0].client.rpc("get_nlz_pilot_readiness", {
    _team_id: teamId,
    _program_run_id: runId,
  });
  assertCheck("athlete cannot read readiness", Boolean(athleteReadiness.error));
  const adminReadiness = await requireData(
    "admin reads readiness",
    systemAdmin.client.rpc("get_nlz_pilot_readiness", {
      _team_id: teamId,
      _program_run_id: runId,
    }),
  );
  assertCheck("admin can read readiness", adminReadiness?.status === "YELLOW");

  const assignments = await requireData(
    "create day assignments",
    service
      .from("user_day_assignments")
      .insert(
        athletes.map(({ id }) => ({
          user_id: id,
          date: today,
          assigned_day_number: 1,
          context_type: "training",
          assignment_reason: {},
          generated_payload: {},
          adaptation_summary: {},
          status: "assigned",
        })),
      )
      .select("id,user_id"),
  );
  const instanceByUser = new Map(
    instances.map(({ user_id, id }) => [user_id, id]),
  );
  const assignmentByUser = new Map(
    assignments.map(({ user_id, id }) => [user_id, id]),
  );

  const save = (athlete, mood = 7) =>
    athlete.client.rpc("save_daily_tracking_v2", {
      _assignment_id: assignmentByUser.get(athlete.id),
      _date: today,
      _event_type: "training",
      _day_number: 1,
      _variant_used: "standard",
      _program_instance_id: instanceByUser.get(athlete.id),
      _tasks_completed: [{ id: "qa-task", completed: true }],
      _reflection: privateMarker,
      _mood_before: mood,
      _energy_level: 8,
      _focus_rating: 7,
      _stress: 4,
      _recovery: 8,
      _sleep_quality: 7,
      _physical_readiness: 8,
      _motivation: 9,
      _pressure: 5,
      _team_connection: 8,
      _comprehension_questions: [{ id: "q1" }],
      _comprehension_results: [{ id: "q1", isCorrect: true }],
    });

  const invalid = await save(athletes[1], 11);
  assertCheck("invalid pulse rejected", Boolean(invalid.error));
  assertCheck(
    "failed save creates no checkin",
    (await requireCount(
      "count invalid checkins",
      service
        .from("daily_checkins")
        .select("id", { count: "exact", head: true })
        .eq("program_instance_id", instanceByUser.get(athletes[1].id)),
    )) === 0,
  );
  assertCheck(
    "failed save creates no completion",
    (await requireCount(
      "count invalid completions",
      service
        .from("user_day_completion")
        .select("id", { count: "exact", head: true })
        .eq("program_instance_id", instanceByUser.get(athletes[1].id)),
    )) === 0,
  );

  const first = await requireData("first atomic save", save(athletes[0]));
  const completionBefore = await requireData(
    "completion timestamp before retry",
    service
      .from("user_day_completion")
      .select("completed_at")
      .eq("id", first.completion_id)
      .single(),
  );
  const retry = await requireData("retry atomic save", save(athletes[0]));
  const completionAfter = await requireData(
    "completion timestamp after retry",
    service
      .from("user_day_completion")
      .select("completed_at")
      .eq("id", retry.completion_id)
      .single(),
  );
  assertCheck(
    "retry is idempotent",
    first.checkin_id === retry.checkin_id &&
      first.completion_id === retry.completion_id,
  );
  assertCheck(
    "completed_at remains stable",
    completionBefore.completed_at === completionAfter.completed_at,
  );

  for (const athlete of athletes.slice(1)) {
    await requireData("atomic athlete save", save(athlete));
  }
  const instanceIds = [...instanceByUser.values()];
  const trackingCounts = await Promise.all(
    ["daily_checkins", "user_day_completion", "comprehension_check_instances"].map(
      (table) =>
        requireCount(
          `count ${table}`,
          service
            .from(table)
            .select("id", { count: "exact", head: true })
            .in("program_instance_id", instanceIds),
        ),
    ),
  );
  assertCheck(
    "exactly one tracking row per athlete",
    trackingCounts.every((count) => count === 5),
  );

  const evidence = await requireData(
    "load evidence for n=5",
    coach.client.rpc("get_nlz_evidence_dossier", { _program_run_id: runId }),
  );
  const dailyPulse = evidence?.team_pulse?.daily?.[0];
  assertCheck(
    "n=5 sensitive aggregate visible",
    dailyPulse?.n === 5 && dailyPulse?.mood !== null,
  );
  assertCheck(
    "evidence is consent scoped",
    evidence?.sample?.consented_athletes === 5,
  );
  assertCheck(
    "private reflection excluded",
    !JSON.stringify(evidence).includes(privateMarker),
  );

  await requireData(
    "reduce consent to n=3",
    service
      .from("profiles")
      .update({ data_contribution_consent: false })
      .in(
        "id",
        athletes.slice(0, 2).map(({ id }) => id),
      ),
  );
  const suppressed = await requireData(
    "load suppressed evidence",
    coach.client.rpc("get_nlz_evidence_dossier", { _program_run_id: runId }),
  );
  const suppressedDaily = suppressed?.team_pulse?.daily?.[0];
  assertCheck(
    "n<5 aggregate values suppressed",
    suppressedDaily?.n === 3 &&
      suppressedDaily?.mood === null &&
      suppressedDaily?.energy === null,
  );
  assertCheck(
    "n<5 marked insufficient",
    suppressed?.sample?.aggregate_visible === false,
  );

  const finalReadiness = await requireData(
    "load final readiness",
    coach.client.rpc("get_nlz_pilot_readiness", {
      _team_id: teamId,
      _program_run_id: runId,
    }),
  );
  assertCheck(
    "tracking integrity remains clean",
    finalReadiness?.data_quality?.duplicate_checkins === 0 &&
      finalReadiness?.data_quality?.checkins_without_program_instance === 0 &&
      finalReadiness?.data_quality?.completion_without_checkin === 0,
  );

  console.log(passed.join("\n"));
  console.log(`SUMMARY ${passed.length}/${passed.length} staging checks passed`);
} finally {
  await cleanup();
  console.log("CLEANUP temporary staging cohort removed");
}
