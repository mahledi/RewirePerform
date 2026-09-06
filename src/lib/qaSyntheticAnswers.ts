// QA helper: generate a neutral, fully-populated answer set for the onboarding
// onboarding questionnaire so QA test users can skip it and jump straight into
// the daily flow. Never used by real users.

import { questions } from "@/data/questionnaireData";

export function buildQASyntheticAnswers(): Record<string, string | string[] | number> {
  const answers: Record<string, string | string[] | number> = {};

  for (const q of questions) {
    switch (q.type) {
      case "scale":
        // Mid-point on a 1-10 scale
        answers[q.id] = 6;
        break;
      case "choice":
        // Pick a sensible middle option if available, else first
        if (q.options && q.options.length > 0) {
          const idx = Math.min(Math.floor(q.options.length / 2), q.options.length - 1);
          answers[q.id] = q.options[idx].id;
        } else {
          answers[q.id] = "";
        }
        break;
      case "multi":
        // Pick first 1-2 options as a neutral selection
        if (q.options && q.options.length > 0) {
          answers[q.id] = q.options.slice(0, Math.min(2, q.options.length)).map((option) => option.id);
        } else {
          answers[q.id] = [];
        }
        break;
      case "text":
      default:
        answers[q.id] = "QA test answer.";
        break;
    }
  }

  // Sport defaults so downstream personalization has signal
  answers["sport-01"] = "Fußball";
  answers["sport-02"] = "Athletin";
  answers["sport-03"] = "youth";

  return answers;
}
