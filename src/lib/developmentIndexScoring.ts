import { REWIRE_DEVELOPMENT_INDEX } from "@/content/questionnaireV2";
import { scoreQuestionAnswer, toScore100 } from "@/lib/questionScoring";

type AnswerValue = string | string[] | number;
type Timing = "pre" | "mid" | "post";

export interface DevelopmentIndexScore {
  overall0to100: number | null;
  subscores: Record<string, number | null>;
  itemScores: Record<string, number>;
  validItemCount: number;
  missingItems: string[];
  timing: Timing;
  disclaimer: string;
}

const scoredItems = REWIRE_DEVELOPMENT_INDEX.items.filter(
  (item) => item.includeInScore && item.id >= "rd-01" && item.id <= "rd-14"
);

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function scoreDevelopmentIndex(
  answers: Record<string, AnswerValue>,
  timing: Timing
): DevelopmentIndexScore {
  const itemScores1to10: Record<string, number> = {};
  const missingItems: string[] = [];

  for (const item of scoredItems) {
    const normalized = scoreQuestionAnswer(item, answers[item.id]);
    if (normalized === null) {
      missingItems.push(item.id);
      continue;
    }
    itemScores1to10[item.id] = normalized;
  }

  const itemScores = Object.fromEntries(
    Object.entries(itemScores1to10).map(([id, score]) => [id, toScore100(score)])
  );

  const subscores: Record<string, number | null> = {};
  for (const [subscoreId, itemIds] of Object.entries(REWIRE_DEVELOPMENT_INDEX.subscores)) {
    const values = itemIds
      .map((id) => itemScores1to10[id])
      .filter((value): value is number => typeof value === "number");
    subscores[subscoreId] = average(values.map(toScore100));
  }

  const overall0to100 = average(Object.values(itemScores));

  return {
    overall0to100,
    subscores,
    itemScores,
    validItemCount: Object.keys(itemScores).length,
    missingItems,
    timing,
    disclaimer: REWIRE_DEVELOPMENT_INDEX.disclaimer,
  };
}
