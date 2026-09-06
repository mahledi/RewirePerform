import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import {
  buildFlameStats,
  countActiveApplications,
  type FlameCompletionRow,
  type FlameStats,
} from "@/lib/flameStats";
import { getCurrentProgramDay } from "@/lib/getCurrentProgramDay";
import { getOrCreateActiveInstance } from "@/lib/programInstance";

const REQUIRED_ASSESSMENTS = ["csai2r", "smtq", "flow_short"] as const;

type AssessmentRow = {
  assessment_type: string;
  timing: string;
};

type DeepProfileRow = {
  timing: string;
};

type SnapshotRow = {
  current_streak: number;
  longest_streak: number;
  days_available: number;
  days_completed: number;
  program_day: number | null;
  tasks_completed_count: number;
};

export interface DashboardInitialStatus {
  preTestsDone: boolean;
  midTestsDone: boolean;
  postTestsDone: boolean;
  midTestDue: boolean;
  postTestDue: boolean;
  todayCheckinDone: boolean;
  todayJournalDone: boolean;
  baselineDone: boolean;
  retestDone: boolean;
  flameStats: FlameStats;
  tasksCompletedCount: number;
  completionRows: FlameCompletionRow[];
  instanceId: string;
}

export const resolveDashboardProgramStart = (
  teamProgramStart: string | null,
  individualProgramStart: string | null,
) => teamProgramStart ?? individualProgramStart;

const hasAllAssessments = (rows: AssessmentRow[], timing: string) => {
  const types = new Set(
    rows
      .filter((row) => row.timing === timing)
      .map((row) => row.assessment_type),
  );
  return REQUIRED_ASSESSMENTS.every((type) => types.has(type));
};

const assertQuery = <T>(
  result: { data: T | null; error: { message?: string } | null },
  label: string,
): T => {
  if (result.error) throw new Error(`${label}:${result.error.message ?? "query_failed"}`);
  return result.data as T;
};

export async function loadDashboardInitialStatus(
  userId: string,
  referenceDate: Date,
  programStartDate: string | null,
  signal?: AbortSignal,
): Promise<DashboardInitialStatus> {
  const requestSignal = signal ?? new AbortController().signal;
  const instance = await getOrCreateActiveInstance(userId, requestSignal);
  if (!instance?.id) throw new Error("active_program_instance_required");

  const today = format(referenceDate, "yyyy-MM-dd");

  const [assessmentsResult, deepProfilesResult] = await Promise.all([
    supabase
      .from("assessments")
      .select("assessment_type,timing")
      .eq("user_id", userId)
      .eq("program_instance_id", instance.id)
      .retry(false)
      .abortSignal(requestSignal),
    supabase
      .from("deep_profile_assessments")
      .select("timing")
      .eq("user_id", userId)
      .eq("program_instance_id", instance.id)
      .retry(false)
      .abortSignal(requestSignal),
  ]);
  const [checkinsResult, journalsResult] = await Promise.all([
    supabase
      .from("daily_checkins")
      .select("id")
      .eq("user_id", userId)
      .eq("date", today)
      .eq("program_instance_id", instance.id)
      .limit(1)
      .retry(false)
      .abortSignal(requestSignal),
    supabase
      .from("daily_journals")
      .select("id")
      .eq("user_id", userId)
      .eq("date", today)
      .eq("program_instance_id", instance.id)
      .limit(1)
      .retry(false)
      .abortSignal(requestSignal),
  ]);
  const [completionsResult, snapshotsResult] = await Promise.all([
    supabase
      .from("user_day_completion")
      .select("day_number,completed_at,completion_status,task_completion")
      .eq("user_id", userId)
      .eq("program_instance_id", instance.id)
      .retry(false)
      .abortSignal(requestSignal),
    supabase
      .from("program_progress_snapshots")
      .select("current_streak,longest_streak,days_available,days_completed,program_day,tasks_completed_count")
      .eq("user_id", userId)
      .eq("program_instance_id", instance.id)
      .order("date", { ascending: false })
      .limit(1)
      .retry(false)
      .abortSignal(requestSignal),
  ]);

  const assessments = assertQuery(
    assessmentsResult as { data: AssessmentRow[] | null; error: { message?: string } | null },
    "assessments",
  ) ?? [];
  const deepProfiles = assertQuery(
    deepProfilesResult as { data: DeepProfileRow[] | null; error: { message?: string } | null },
    "deep_profiles",
  ) ?? [];
  const checkins = assertQuery(
    checkinsResult as { data: { id: string }[] | null; error: { message?: string } | null },
    "daily_checkins",
  ) ?? [];
  const journals = assertQuery(
    journalsResult as { data: { id: string }[] | null; error: { message?: string } | null },
    "daily_journals",
  ) ?? [];
  const completionRows = assertQuery(
    completionsResult as { data: FlameCompletionRow[] | null; error: { message?: string } | null },
    "day_completion",
  ) ?? [];
  const snapshots = assertQuery(
    snapshotsResult as { data: SnapshotRow[] | null; error: { message?: string } | null },
    "progress_snapshot",
  ) ?? [];

  const preTestsDone = hasAllAssessments(assessments, "pre");
  const midTestsDone = hasAllAssessments(assessments, "mid");
  const postTestsDone = hasAllAssessments(assessments, "post");
  const deepTimings = new Set(deepProfiles.map((row) => row.timing));
  const programDay = getCurrentProgramDay(instance.started_at ?? programStartDate, referenceDate)?.dayNumber ?? null;
  const snapshot = snapshots[0] ?? null;
  const daysAvailable = programDay ?? snapshot?.days_available ?? 0;
  const baseFlameStats = buildFlameStats({
    completions: completionRows,
    snapshot,
    today: referenceDate,
  });

  return {
    preTestsDone,
    midTestsDone,
    postTestsDone,
    midTestDue: Boolean(programDay && programDay >= 28 && programDay < 56 && !midTestsDone),
    postTestDue: Boolean(programDay && programDay >= 56 && !postTestsDone),
    todayCheckinDone: checkins.length > 0,
    todayJournalDone: journals.length > 0,
    baselineDone: deepTimings.has("pre") || deepTimings.has("baseline"),
    retestDone: deepTimings.has("post") || deepTimings.has("retest"),
    flameStats: {
      ...baseFlameStats,
      daysAvailable,
      programDay: programDay ?? baseFlameStats.programDay,
      completionRate: daysAvailable > 0
        ? Math.min(1, baseFlameStats.totalCompletedDays / daysAvailable)
        : baseFlameStats.completionRate,
      missedDaysCount: Math.max(0, daysAvailable - baseFlameStats.totalCompletedDays),
    },
    tasksCompletedCount: Math.max(
      countActiveApplications(completionRows),
      snapshot?.tasks_completed_count ?? 0,
    ),
    completionRows,
    instanceId: instance.id,
  };
}
