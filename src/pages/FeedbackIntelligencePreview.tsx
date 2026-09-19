import { useState } from "react";

import { FeedbackQuestionnairePreview } from "@/components/feedback-intelligence/FeedbackQuestionnairePreview";
import type { FeedbackCheckpointDay } from "@/content/feedbackIntelligenceV1";
import { cn } from "@/lib/utils";

const days: readonly FeedbackCheckpointDay[] = [10, 24, 39, 55];

const FeedbackIntelligencePreview = () => {
  const [day, setDay] = useState<FeedbackCheckpointDay>(10);

  return (
    <div className="min-h-screen bg-[#08090C] px-4 py-8 text-white sm:px-8">
      <div className="mx-auto mb-7 max-w-[720px] text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
          Interne synthetische Vorschau · keine Speicherung
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
          Feedback Intelligence 1.1
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/50">
          Hier werden nur der deterministische Ablauf und die Texte geprüft. Es werden weder Supabase noch Analytics oder KI aufgerufen.
        </p>
        <div className="mx-auto mt-5 grid max-w-sm grid-cols-4 gap-2" aria-label="Checkpoint auswählen">
          {days.map((checkpointDay) => (
            <button
              key={checkpointDay}
              type="button"
              onClick={() => setDay(checkpointDay)}
              className={cn(
                "h-10 rounded-xl border text-sm font-semibold transition-colors",
                day === checkpointDay
                  ? "border-primary/50 bg-primary/15 text-primary"
                  : "border-white/10 bg-white/[0.035] text-white/55 hover:text-white",
              )}
            >
              Tag {checkpointDay}
            </button>
          ))}
        </div>
      </div>

      <FeedbackQuestionnairePreview key={day} day={day} />
    </div>
  );
};

export default FeedbackIntelligencePreview;
