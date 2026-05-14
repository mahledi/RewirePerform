// Deterministic, AI-free progress summary for the Deep-Dive Re-Test.

type AnswerValue = string | string[] | number | undefined;
type Answers = Record<string, AnswerValue>;

interface QuestionMeta {
  id: string;
  question: string;
  type: string;
}

export interface ProgressSummary {
  summary: string;
  hasEnoughData: boolean;
  improved: number;
  unchanged: number;
  declined: number;
  strongestImprovement?: { question: string; delta: number };
  largestDecline?: { question: string; delta: number };
}

const MIN_PAIRS = 3;

export function buildDeterministicProgressSummary(
  baseline: Answers | null | undefined,
  retest: Answers | null | undefined,
  questions: QuestionMeta[]
): ProgressSummary {
  if (!baseline || !retest) {
    return {
      summary: "Noch nicht genug Daten für eine Verlaufszusammenfassung.",
      hasEnoughData: false,
      improved: 0,
      unchanged: 0,
      declined: 0,
    };
  }

  let improved = 0;
  let unchanged = 0;
  let declined = 0;
  let strongest: { question: string; delta: number } | undefined;
  let weakest: { question: string; delta: number } | undefined;

  for (const q of questions) {
    if (q.type !== "scale") continue;
    const b = baseline[q.id];
    const r = retest[q.id];
    if (typeof b !== "number" || typeof r !== "number") continue;
    const delta = r - b;
    if (delta > 0) improved++;
    else if (delta < 0) declined++;
    else unchanged++;
    if (!strongest || delta > strongest.delta) strongest = { question: q.question, delta };
    if (!weakest || delta < weakest.delta) weakest = { question: q.question, delta };
  }

  const total = improved + unchanged + declined;
  if (total < MIN_PAIRS) {
    return {
      summary: "Noch nicht genug Daten für eine Verlaufszusammenfassung.",
      hasEnoughData: false,
      improved,
      unchanged,
      declined,
    };
  }

  const lines: string[] = [];
  lines.push(`In ${improved} von ${total} Bereichen zeigen deine Antworten eine positive Veränderung.`);
  if (strongest && strongest.delta > 0) {
    lines.push(`Stärkste Veränderung: "${strongest.question}" (+${strongest.delta}).`);
  }
  if (weakest && weakest.delta < 0) {
    lines.push(`Offen oder rückläufig: "${weakest.question}" (${weakest.delta}).`);
  } else if (unchanged > 0) {
    lines.push(`${unchanged} Bereich${unchanged === 1 ? "" : "e"} unverändert.`);
  }
  lines.push(
    "Diese Auswertung beschreibt beobachtete Veränderung in deinen Antworten — keine Diagnose, kein psychologisches Urteil."
  );

  return {
    summary: lines.join("\n\n"),
    hasEnoughData: true,
    improved,
    unchanged,
    declined,
    strongestImprovement: strongest && strongest.delta > 0 ? strongest : undefined,
    largestDecline: weakest && weakest.delta < 0 ? weakest : undefined,
  };
}
