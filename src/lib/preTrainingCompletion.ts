import { supabase } from "@/integrations/supabase/client";
import { ensureAssignment } from "@/lib/dayAssignment";
import { hasCompletedPreTraining, withPreTrainingCompletion } from "@/lib/preTrainingState";

type PreTrainingEventType = "training" | "competition";

export const loadPreTrainingCompletion = async (userId: string, date: string) => {
  const { data, error } = await supabase
    .from("user_day_assignments")
    .select("generated_payload")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();

  if (error) throw error;
  return hasCompletedPreTraining(data?.generated_payload);
};

export const markPreTrainingCompleted = async (args: {
  userId: string;
  date: Date;
  eventType: PreTrainingEventType;
  sport?: string | null;
  position?: string | null;
}) => {
  const ensured = await ensureAssignment({
    userId: args.userId,
    date: args.date,
    contextType: args.eventType,
    sport: args.sport,
    position: args.position,
  });

  if (!ensured) throw new Error("pre_training_assignment_unavailable");

  const generatedPayload = withPreTrainingCompletion(
    ensured.assignment.generated_payload,
    args.eventType,
    new Date().toISOString(),
  );
  const { error } = await supabase
    .from("user_day_assignments")
    .update({ generated_payload: generatedPayload })
    .eq("id", ensured.assignment.id)
    .eq("user_id", args.userId);

  if (error) throw error;
};
