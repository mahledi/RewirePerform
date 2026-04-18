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
import { getCurrentProgramDay } from "@/lib/getCurrentProgramDay";
import { resolveDay } from "@/lib/getDayContent";
import { drawComprehensionQuestions } from "@/content/dailyContent";
import type { CalendarEventType, ResolvedDay, ComprehensionQuestion } from "@/content/matrixDayTypes";

export interface AssignmentRecord {
  id: string;
  user_id: string;
  date: string;
  assigned_day_number: number;
  context_type: string;
  generated_payload: any;
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

  // 1) program day berechnen
  const { data: settings } = await supabase
    .from("program_settings")
    .select("program_start")
    .eq("user_id", input.userId)
    .maybeSingle();

  const info = getCurrentProgramDay(settings?.program_start ?? null, input.date);
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
      lens: resolved.matrix.lens,
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
      assignment_reason: { source: "deterministic", program_day: info.dayNumber } as any,
      adaptation_summary: { sport: input.sport ?? null, position: input.position ?? null } as any,
      generated_payload: payload as any,
    } as any)
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
}) {
  const { data: existing } = await supabase
    .from("user_day_completion")
    .select("id")
    .eq("assignment_id", args.assignmentId)
    .maybeSingle();

  const base = {
    assignment_id: args.assignmentId,
    user_id: args.userId,
    day_number: args.dayNumber,
    task_completion: args.completedTaskTitles,
    completion_status: args.status,
    variant_used: args.variantUsed ?? null,
    opened_at: existing ? undefined : new Date().toISOString(),
    completed_at: args.status === "completed" ? new Date().toISOString() : null,
  };

  if (existing) {
    return supabase.from("user_day_completion").update(base).eq("id", existing.id);
  }
  return supabase.from("user_day_completion").insert(base);
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
}) {
  const correctCount = args.results.filter((r) => r.isCorrect).length;
  const { data: existing } = await supabase
    .from("comprehension_check_instances")
    .select("id")
    .eq("assignment_id", args.assignmentId)
    .maybeSingle();

  const base: any = {
    assignment_id: args.assignmentId,
    user_id: args.userId,
    day_number: args.dayNumber,
    generated_questions: args.questions,
    results: args.results,
    correct_count: correctCount,
    total_count: args.questions.length,
    status: args.status,
    completed_at: args.status === "completed" ? new Date().toISOString() : null,
  };

  if (existing) {
    return supabase.from("comprehension_check_instances").update(base).eq("id", existing.id);
  }
  return supabase.from("comprehension_check_instances").insert(base);
}

export { drawComprehensionQuestions };
