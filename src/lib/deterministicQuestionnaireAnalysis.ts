import {
  ONBOARDING_V2_CATEGORIES,
  ONBOARDING_V2_QUESTIONS,
  ONBOARDING_V2_VERSION,
} from "@/content/questionnaireV2";
import { scoreQuestionAnswer, toScore100 } from "@/lib/questionScoring";

type AnswerValue = string | string[] | number;
type Answers = Record<string, AnswerValue>;

export interface DeterministicAnalysis {
  summary: string;
  strengths: { title: string; description: string; science: string }[];
  development_areas: {
    title: string;
    description: string;
    priority: "high" | "medium" | "low";
    science: string;
  }[];
  patterns: { title: string; description: string }[];
  recommendations: {
    title: string;
    description: string;
    duration: string;
    frequency: string;
  }[];
  training_day_tasks: string[];
  rest_day_tasks: string[];
  mental_score: number;
  start_profile_score: number;
  category_scores: Record<string, number>;
  strongest_dimensions: string[];
  dominant_category: string;
  inner_excellence_profile: {
    growth_mindset_score: number;
    presence_level: number;
    ego_freedom_score: number;
    emotional_control_score: number;
    purpose_orientation_score: number;
    pressure_regulation_score: number;
  };
  scores: {
    start_profile_score: number;
    category_scores: Record<string, number>;
    item_scores: Record<string, number>;
    version: string;
  };
  privacy_summary: {
    private_answers_excluded_from_coach: boolean;
    aggregate_minimum_n: number;
    free_text_private: boolean;
  };
  source: "deterministic_v2";
}

const categoryById = new Map(ONBOARDING_V2_CATEGORIES.map((category) => [category.id, category]));

const LABELS: Record<string, string> = {
  sport_profile: "Sportprofil",
  identity_selfworth: "Selbstwert & Identität",
  mistakes_evaluation: "Fehler & Bewertung",
  pressure_emotions: "Druck & Emotionen",
  focus_presence: "Fokus & Präsenz",
  motivation_purpose: "Motivation & Sinn",
  recovery_load: "Erholung & Belastung",
  environment_team: "Umfeld & Team",
  growth_learning: "Lernen & Wachstum",
  deep_sport_profile: "Druckprofil",
};

const STRENGTH_COPY: Record<string, string> = {
  identity_selfworth: "Du kannst Leistung und persönlichen Wert zunehmend getrennt betrachten.",
  mistakes_evaluation: "Fehler wirken bei dir eher als Information für die nächste Aktion.",
  pressure_emotions: "Du bleibst unter Aktivierung handlungsfähig und findest zurück zur Aufgabe.",
  focus_presence: "Du bemerkst Ablenkung und kannst deine Aufmerksamkeit zurückholen.",
  motivation_purpose: "Dein Antrieb wirkt stärker prozess- und beitragsorientiert.",
  recovery_load: "Du erkennst Erholung als aktiven Teil von Entwicklung.",
  environment_team: "Dein Umfeld wirkt als Ressource für Offenheit und Lernen.",
  growth_learning: "Unsicherheit und Rückschläge können bei dir Lernsignale werden.",
  deep_sport_profile: "Du hast ein klares Bild deiner typischen Druckmuster.",
};

const DEVELOPMENT_COPY: Record<string, string> = {
  identity_selfworth: "Leistung und Selbstwert scheinen noch eng gekoppelt zu sein.",
  mistakes_evaluation: "Fehler beeinflussen aktuell noch stark die nächste Aktion.",
  pressure_emotions: "Druck und Emotionen könnten deine Entscheidungsqualität senken.",
  focus_presence: "Fokus und Rückkehr in den Moment sind ein starker nächster Hebel.",
  motivation_purpose: "Der innere Antrieb kann noch stabiler an Prozess und Sinn gekoppelt werden.",
  recovery_load: "Erholung und Belastungswahrnehmung verdienen mehr aktive Steuerung.",
  environment_team: "Sicherheit, Vertrauen oder Erwartungsdruck im Umfeld brauchen Beobachtung.",
  growth_learning: "Kritik, Unsicherheit und Rückschläge sind noch offene Trainingskanten.",
  deep_sport_profile: "Deine Drucksituationen brauchen klare Wenn-dann-Anker.",
};

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function computeScores(answers: Answers) {
  const buckets: Record<string, number[]> = {};
  const item_scores: Record<string, number> = {};
  const dimension_scores: Record<string, number> = {};

  for (const question of ONBOARDING_V2_QUESTIONS) {
    if (!question.includeInScore) continue;
    const normalized = scoreQuestionAnswer(question, answers[question.id]);
    if (normalized === null) continue;

    const score100 = toScore100(normalized);
    item_scores[question.id] = score100;
    if (question.dimension) dimension_scores[question.dimension] = score100;
    (buckets[question.category] ||= []).push(score100);
  }

  const category_scores: Record<string, number> = {};
  for (const [category, scores] of Object.entries(buckets)) {
    if (scores.length === 0) continue;
    category_scores[category] = clamp(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  }

  const values = Object.values(category_scores);
  const start_profile_score = values.length
    ? clamp(values.reduce((sum, score) => sum + score, 0) / values.length)
    : 50;

  return { category_scores, item_scores, dimension_scores, start_profile_score };
}

function scienceLine(category: string): string {
  if (category === "recovery_load") return "Regeneration stabilisiert Lernprozesse und Belastungstoleranz.";
  if (category === "focus_presence") return "Aufmerksamkeitsrückkehr ist eine trainierbare Grundlage für konstante Performance.";
  if (category === "pressure_emotions") return "Emotionsregulation erhöht Handlungsfähigkeit in Druckmomenten.";
  if (category === "mistakes_evaluation") return "Schnelle Fehlererholung schützt Entscheidungsqualität in der nächsten Aktion.";
  if (category === "environment_team") return "Psychologische Sicherheit verbessert Lernen, Feedback und Teamhandeln.";
  return "Diese Einordnung ist ein interner, deterministischer Startwert und kein Diagnosewert.";
}

function buildPatterns(category_scores: Record<string, number>) {
  const get = (category: string) => category_scores[category] ?? 50;
  const patterns: { title: string; description: string }[] = [];

  if (get("mistakes_evaluation") < 50 && get("pressure_emotions") < 55) {
    patterns.push({
      title: "Fehler + Druck",
      description: "Wenn Fehler und Bewertungsdruck zusammenkommen, braucht dein System klare Rückkehr-Anker.",
    });
  }
  if (get("focus_presence") < 55 && get("motivation_purpose") >= 60) {
    patterns.push({
      title: "Antrieb braucht Fokusanker",
      description: "Energie ist vorhanden, aber Aufmerksamkeit profitiert von klaren nächsten Aufgaben.",
    });
  }
  if (get("recovery_load") < 50) {
    patterns.push({
      title: "Recovery als Leistungshebel",
      description: "Erholung ist aktuell ein Entwicklungsfeld, nicht nur eine Pause vom Training.",
    });
  }
  if (get("environment_team") < 55) {
    patterns.push({
      title: "Umfeld unter Beobachtung",
      description: "Erwartungen und Sicherheit im Umfeld können tägliche Aktivität spürbar beeinflussen.",
    });
  }
  if (patterns.length === 0) {
    patterns.push({
      title: "Stabiles Startbild",
      description: "Deine Antworten zeigen kein dominantes Reibungsmuster. Der Fokus liegt auf Konsistenz.",
    });
  }

  return patterns.slice(0, 4);
}

function buildInnerExcellenceProfile(category_scores: Record<string, number>) {
  const identity = category_scores.identity_selfworth ?? 50;
  const mistakes = category_scores.mistakes_evaluation ?? 50;
  const focus = category_scores.focus_presence ?? 50;
  const emotion = category_scores.pressure_emotions ?? 50;
  const motivation = category_scores.motivation_purpose ?? 50;
  const growth = category_scores.growth_learning ?? 50;
  const recovery = category_scores.recovery_load ?? 50;

  return {
    growth_mindset_score: clamp((growth + mistakes) / 2),
    presence_level: clamp(focus),
    ego_freedom_score: clamp(identity),
    emotional_control_score: clamp(emotion),
    purpose_orientation_score: clamp(motivation),
    pressure_regulation_score: clamp((emotion + focus + recovery) / 3),
  };
}

export function buildDeterministicQuestionnaireAnalysis(
  answers: Answers,
  _profile?: { sport?: string | null; position?: string | null; level?: string | null }
): DeterministicAnalysis {
  const { category_scores, item_scores, dimension_scores, start_profile_score } = computeScores(answers);
  const ranked = Object.entries(category_scores).sort((a, b) => b[1] - a[1]);
  const dominantKey = ranked[0]?.[0] ?? "focus_presence";
  const dominant_category = LABELS[dominantKey] ?? categoryById.get(dominantKey)?.title ?? dominantKey;

  const strengths = ranked
    .filter(([, score]) => score >= 60)
    .slice(0, 4)
    .concat(ranked.length ? [] : [["focus_presence", 50] as [string, number]])
    .slice(0, 4)
    .map(([category]) => ({
      title: LABELS[category] ?? category,
      description: STRENGTH_COPY[category] ?? "Hier zeigen deine Antworten bereits tragfähige Muster.",
      science: scienceLine(category),
    }));

  const lowRanked = [...ranked].reverse();
  const development_areas = (lowRanked.length ? lowRanked : [["focus_presence", 50] as [string, number]])
    .filter(([, score], index) => score <= 58 || index < 2)
    .slice(0, 4)
    .map(([category, score]) => ({
      title: LABELS[category] ?? category,
      description: DEVELOPMENT_COPY[category] ?? "Das ist ein sinnvolles Entwicklungsfeld für die nächsten Wochen.",
      priority: (score <= 35 ? "high" : score <= 50 ? "medium" : "low") as "high" | "medium" | "low",
      science: scienceLine(category),
    }));

  const strongest_dimensions = Object.entries(dimension_scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([dimension]) => dimension);

  return {
    summary: `Dein Startprofil zeigt aktuell den stärksten Bereich in "${dominant_category}". Diese Auswertung beschreibt Antwortmuster für dein 56-Tage-System und ist keine Diagnose.`,
    strengths,
    development_areas,
    patterns: buildPatterns(category_scores),
    recommendations: [
      {
        title: "Täglicher Check-in",
        description: "Nutze den Check-in kurz und ehrlich. Er ist dein täglicher Zustandsanker.",
        duration: "2 Min",
        frequency: "täglich",
      },
      {
        title: "Nächste Aufgabe",
        description: "Nach Fehlern zählt nicht Analyse, sondern die klare Rückkehr zur nächsten Aktion.",
        duration: "im Training",
        frequency: "laufend",
      },
      {
        title: "Journal als Musterblick",
        description: "Schreibe knapp, aber echt. Das Journal bleibt privat und dient deiner Mustererkennung.",
        duration: "3 Min",
        frequency: "abends",
      },
    ],
    training_day_tasks: [
      "Vor dem Training: Tages-Cue in einem Satz setzen.",
      "Im Training: eine bewusste Rückkehr nach Fehlern markieren.",
      "Nach dem Training: eine gelungene Prozessaktion notieren.",
    ],
    rest_day_tasks: [
      "Erholung bewusst planen, nicht rechtfertigen.",
      "10 Minuten ohne Input: Atmung, Spaziergang oder Ruhe.",
      "Ein Muster benennen, das morgen leichter werden soll.",
    ],
    mental_score: start_profile_score,
    start_profile_score,
    category_scores,
    strongest_dimensions,
    dominant_category,
    inner_excellence_profile: buildInnerExcellenceProfile(category_scores),
    scores: {
      start_profile_score,
      category_scores,
      item_scores,
      version: ONBOARDING_V2_VERSION,
    },
    privacy_summary: {
      private_answers_excluded_from_coach: true,
      aggregate_minimum_n: 5,
      free_text_private: true,
    },
    source: "deterministic_v2",
  };
}
