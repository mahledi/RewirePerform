/**
 * Day Assignment Service
 *
 * Idempotente Schicht zwischen Matrix-Content und DB:
 *   - ensureAssignment(): erstellt oder lädt das Assignment für (user, date)
 *   - upsertCompletion(): speichert opened/completed/tasks
 *   - upsertComprehension(): speichert generierte Fragen + Ergebnisse
 *
 * Quelle der Tagesinhalte bleibt src/content/* (TS-Files).
 * DB speichert nur "was wurde wann zugewiesen + wie wurde es bearbeitet".
 */
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import type { Json, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { getCurrentProgramDay, getEffectiveProgramStart } from "@/lib/getCurrentProgramDay";
import { resolveDay } from "@/lib/getDayContent";
import { drawProgramV11ComprehensionQuestions } from "@/content/programV11";
import type { CalendarEventType, ResolvedDay, ComprehensionQuestion } from "@/content/matrixDayTypes";

export interface AssignmentRecord {
  id: string;
  user_id: string;
  date: string;
  assigned_day_number: number;
  context_type: string;
  generated_payload: Json;
}

export interface EnsureAssignmentInput {
  userId: string;
  date: Date;
  contextType: CalendarEventType;
  sport?: string | null;
  position?: string | null;
}

/**
 * Liefert das Assignment für (user, date). Erstellt es bei Bedarf.
 * Resolved-Day wird aus den TS-Content-Files gebaut und als payload gespeichert.
 */
export async function ensureAssignment(
  input: EnsureAssignmentInput
): Promise<{ assignment: AssignmentRecord; resolved: ResolvedDay } | null> {
  const dateStr = format(input.date, "yyyy-MM-dd");

  // 1) program day berechnen — Team-Start hat Vorrang vor Solo-Start
  const effective = await getEffectiveProgramStart(input.userId);
  const info = getCurrentProgramDay(effective.startDate, input.date);
  if (!info) return null;

  const resolved = resolveDay(info.dayNumber, input.date, input.contextType, {
    sport: input.sport ?? null,
    position: input.position ?? null,
  });
  if (!resolved) return null;

  // 2) existing?
  const { data: existing } = await supabase
    .from("user_day_assignments")
    .select("*")
    .eq("user_id", input.userId)
    .eq("date", dateStr)
    .maybeSingle();

  if (existing) {
    return { assignment: existing as AssignmentRecord, resolved };
  }

  // 3) insert
  const payload = {
    matrix: resolved.matrix,
    contentSummary: {
      lens: resolved.content.title ?? resolved.content.lens ?? resolved.matrix.lens,
      taskTitles: resolved.content.tasks.map((t) => t.title),
    },
  };
  const { data: inserted, error } = await supabase
    .from("user_day_assignments")
    .insert({
      user_id: input.userId,
      date: dateStr,
      assigned_day_number: info.dayNumber,
      context_type: input.contextType,
      assignment_reason: { source: "deterministic", program_day: info.dayNumber },
      adaptation_summary: { sport: input.sport ?? null, position: input.position ?? null },
      generated_payload: payload as unknown as Json,
    })
    .select()
    .single();

  if (error) {
    console.error("ensureAssignment insert error:", error);
    return null;
  }
  return { assignment: inserted as AssignmentRecord, resolved };
}

export async function upsertCompletion(args: {
  assignmentId: string;
  userId: string;
  dayNumber: number;
  completedTaskTitles: string[];
  status: "in_progress" | "completed";
  variantUsed?: string;
  programInstanceId?: string | null;
}) {
  const { data: existing } = await supabase
    .from("user_day_completion")
    .select("id, user_id, completion_status, completed_at, program_instance_id")
    .eq("assignment_id", args.assignmentId)
    .eq("user_id", args.userId)
    .maybeSingle();

  const alreadyCompleted = existing?.completion_status === "completed";
  const completionStatus = alreadyCompleted ? "completed" : args.status;
  const completedAt = alreadyCompleted
    ? existing.completed_at
    : args.status === "completed"
      ? new Date().toISOString()
      : null;

  const base: TablesUpdate<"user_day_completion"> = {
    assignment_id: args.assignmentId,
    user_id: args.userId,
    day_number: args.dayNumber,
    task_completion: args.completedTaskTitles as unknown as Json,
    completion_status: completionStatus,
    variant_used: args.variantUsed ?? null,
    completed_at: completedAt,
    program_instance_id: args.programInstanceId ?? existing?.program_instance_id ?? null,
  };

  if (existing) {
    return supabase.from("user_day_completion").update(base).eq("id", existing.id);
  }
  const insert: TablesInsert<"user_day_completion"> = {
    ...base,
    assignment_id: args.assignmentId,
    user_id: args.userId,
    day_number: args.dayNumber,
    opened_at: new Date().toISOString(),
  };
  return supabase.from("user_day_completion").insert(insert);
}

export interface ComprehensionResult {
  questionId: string;
  selectedOptionId: string;
  isCorrect: boolean;
}

export async function upsertComprehension(args: {
  assignmentId: string;
  userId: string;
  dayNumber: number;
  questions: ComprehensionQuestion[];
  results: ComprehensionResult[];
  status: "pending" | "completed";
  programInstanceId?: string | null;
}) {
  const correctCount = args.results.filter((r) => r.isCorrect).length;
  const { data: existing } = await supabase
    .from("comprehension_check_instances")
    .select("id, completed_at, program_instance_id")
    .eq("assignment_id", args.assignmentId)
    .eq("user_id", args.userId)
    .maybeSingle();

  const base: TablesUpdate<"comprehension_check_instances"> = {
    assignment_id: args.assignmentId,
    user_id: args.userId,
    day_number: args.dayNumber,
    generated_questions: args.questions as unknown as Json,
    results: args.results as unknown as Json,
    correct_count: correctCount,
    total_count: args.questions.length,
    status: args.status,
    completed_at: args.status === "completed"
      ? existing?.completed_at ?? new Date().toISOString()
      : null,
    program_instance_id: args.programInstanceId ?? existing?.program_instance_id ?? null,
  };

  if (existing) {
    return supabase.from("comprehension_check_instances").update(base).eq("id", existing.id);
  }
  const insert: TablesInsert<"comprehension_check_instances"> = {
    ...base,
    assignment_id: args.assignmentId,
    user_id: args.userId,
    day_number: args.dayNumber,
  };
  return supabase.from("comprehension_check_instances").insert(insert);
}

export const drawComprehensionQuestions = (
  dayNumber: number,
  _count = 1,
) => drawProgramV11ComprehensionQuestions(dayNumber);
