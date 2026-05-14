// Deterministic, AI-free questionnaire analysis.
// Builds the same shape previously produced by analyze-questionnaire,
// using only local rules over the user's answers.

import { questions as allQuestions, categories as allCategories } from "@/data/questionnaireData";

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
  dominant_category: string;
  inner_excellence_profile: {
    growth_mindset_score: number;
    presence_level: number;
    ego_freedom_score: number;
    emotional_control_score: number;
    purpose_orientation_score: number;
    pressure_regulation_score: number;
  };
  // Marker, so anyone reading the row knows this isn't AI output.
  source: "deterministic_v1";
}

const CATEGORY_LABELS: Record<string, string> = {
  identity: "Identität & Selbstbild",
  resilience: "Mentale Stärke & Resilienz",
  focus: "Fokus & Flow",
  emotions: "Emotionsregulation",
  motivation: "Antrieb & Purpose",
  competition: "Wettkampf-Mindset",
  recovery: "Erholung & Regeneration",
  environment: "Umfeld & Beziehungen",
  philosophy: "Philosophie & Vision",
  neurocognition: "Mentales Betriebssystem",
  inner_excellence: "Inner Excellence",
  deep_profile: "Athleten-Profil",
};

// Average all numeric (Likert 1-10) answers per category.
// Returns a map: categoryId -> 0..100 score (or undefined when no signal).
function categoryScores(answers: Answers): Record<string, number> {
  const buckets: Record<string, number[]> = {};
  for (const q of allQuestions) {
    const a = answers[q.id];
    if (q.type === "scale" && typeof a === "number") {
      // 1..10 -> 0..100
      const norm = Math.max(0, Math.min(100, ((a - 1) / 9) * 100));
      (buckets[q.category] ||= []).push(norm);
    }
  }
  const out: Record<string, number> = {};
  for (const [cat, vals] of Object.entries(buckets)) {
    if (vals.length === 0) continue;
    out[cat] = Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
  }
  return out;
}

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

const STRENGTH_TEMPLATES: Record<string, { description: string; science: string }> = {
  identity: {
    description: "Dein Selbstbild wirkt stabil und unabhängig von einzelnen Ergebnissen.",
    science: "Stabile Identität reduziert Bewertungsdruck und schützt langfristig vor Burnout.",
  },
  resilience: {
    description: "Du gehst aktuell konstruktiv mit Druck und Rückschlägen um.",
    science: "Resilienz-Marker korrelieren mit aMCC-Aktivität und Wiederaufnahme nach Fehlern.",
  },
  focus: {
    description: "Dein Fokus wirkt aktuell trainiert und alltagstauglich.",
    science: "Anhaltende Aufmerksamkeit ist die Grundlage für Flow- und Lernzustände.",
  },
  emotions: {
    description: "Du nimmst Emotionen wahr und nutzt sie als Information statt als Störung.",
    science: "Emotionsregulation senkt Cortisol-Spitzen unter Wettkampfdruck.",
  },
  motivation: {
    description: "Dein Antrieb wirkt klar und intrinsisch verankert.",
    science: "Intrinsische Motivation hält Trainingsqualität auch bei Misserfolg stabil.",
  },
  competition: {
    description: "Im Wettkampf wirkst du handlungsfähig statt blockiert.",
    science: "Approach-Mindset im Wettkampf reduziert Fehlerangst und erhöht Risikobereitschaft im Plan.",
  },
  recovery: {
    description: "Du gibst Erholung aktuell den Stellenwert, den sie verdient.",
    science: "Schlaf und gezielte Pausen sind Voraussetzung für neuronale Konsolidierung.",
  },
  environment: {
    description: "Dein Umfeld wirkt aktuell unterstützend und ehrlich.",
    science: "Soziale Unterstützung ist einer der stärksten Prädiktoren für mentale Stabilität.",
  },
  philosophy: {
    description: "Du hast Ansätze einer eigenen Leistungs-Philosophie.",
    science: "Wertegeleitetes Handeln stabilisiert Verhalten unter Stress.",
  },
  neurocognition: {
    description: "Du verstehst dein 'mentales Betriebssystem' und arbeitest bewusst damit.",
    science: "Metakognition verbessert Selbststeuerung und Lernrate.",
  },
  inner_excellence: {
    description: "Präsenz, Wachstum und Ego-Freiheit wirken bei dir bereits angelegt.",
    science: "Inner-Excellence-Konzepte wirken direkt auf Aufmerksamkeit und Reaktivität.",
  },
  deep_profile: {
    description: "Dein Athleten-Profil ist scharf umrissen.",
    science: "Klares Profil ermöglicht passgenaue Mikroanpassungen.",
  },
};

const DEVELOPMENT_TEMPLATES: Record<string, { description: string; science: string }> = {
  identity: {
    description: "Dein Selbstwert wirkt aktuell stark mit Ergebnissen verknüpft.",
    science: "Identitätsarbeit reduziert die Abhängigkeit von externer Bestätigung.",
  },
  resilience: {
    description: "Rückschläge wirken aktuell länger nach als hilfreich wäre.",
    science: "Wiederaufnahme nach Fehlern ist trainierbar — kleine Reps zählen.",
  },
  focus: {
    description: "Fokus bricht aktuell schneller, als du es dir wünschst.",
    science: "Aufmerksamkeit ist eine trainierbare Fähigkeit, keine feste Eigenschaft.",
  },
  emotions: {
    description: "Emotionen wirken im Wettkampf eher als Störung denn als Information.",
    science: "Benennen und Einordnen von Emotionen senkt Amygdala-Reaktivität.",
  },
  motivation: {
    description: "Dein Antrieb wirkt aktuell stark extrinsisch geprägt.",
    science: "Verbindung zu eigenen Werten erhöht Durchhaltefähigkeit.",
  },
  competition: {
    description: "Im Wettkampf bremst dich aktuell etwas, das im Training nicht da ist.",
    science: "Wettkampf ist ein eigener Kontext, der eigene Routinen verlangt.",
  },
  recovery: {
    description: "Erholung wirkt aktuell unterbewertet.",
    science: "Ohne Erholung baut das Nervensystem keine neuen Muster auf.",
  },
  environment: {
    description: "Dein Umfeld wirkt aktuell nicht eindeutig unterstützend.",
    science: "Bewusste Auswahl von Bezugspersonen ist ein Performance-Faktor.",
  },
  philosophy: {
    description: "Eine eigene Leistungs-Philosophie ist noch im Entstehen.",
    science: "Werte-Klärung gibt Verhalten unter Druck eine Richtung.",
  },
  neurocognition: {
    description: "Dein 'mentales Betriebssystem' wirkt aktuell teilweise im Autopilot.",
    science: "Metakognitives Training erhöht bewusste Selbststeuerung.",
  },
  inner_excellence: {
    description: "Präsenz und Ego-Freiheit sind aktuell ausbaufähig.",
    science: "Diese Skills wirken direkt auf Reaktivität und Entscheidungsqualität.",
  },
  deep_profile: {
    description: "Dein Athleten-Profil hat noch offene Stellen.",
    science: "Mehr Klarheit hier ermöglicht präzisere Mikroanpassungen.",
  },
};

function buildPatterns(scores: Record<string, number>): { title: string; description: string }[] {
  const patterns: { title: string; description: string }[] = [];
  const s = (k: string) => (typeof scores[k] === "number" ? scores[k] : 50);

  if (s("competition") < 45 && s("recovery") < 45) {
    patterns.push({
      title: "Druck & Erholung",
      description:
        "Druck wirkt aktuell stärker, wenn die Erholung niedrig ist. Schlaf und Pausen vorzuziehen, hat hier einen großen Hebel.",
    });
  }
  if (s("motivation") >= 60 && s("focus") < 50) {
    patterns.push({
      title: "Energie ohne Struktur",
      description:
        "Energie ist da, aber Fokus braucht klarere Struktur. Kleinere Aufgaben mit klarem Cue helfen aktuell mehr als große Pläne.",
    });
  }
  if (s("identity") < 50) {
    patterns.push({
      title: "Identität & Bewertung",
      description:
        "Leistung scheint aktuell stark mit Selbstbewertung verbunden zu sein. Trennung von 'wer ich bin' und 'wie ich heute performt habe' ist ein zentraler Hebel.",
    });
  }
  if (s("recovery") < 40) {
    patterns.push({
      title: "Regeneration aktiv schützen",
      description: "Regeneration sollte aktiv geschützt werden — sonst frisst sie dein nächstes Trainingsfenster.",
    });
  }
  if (s("emotions") < 45 && s("competition") < 50) {
    patterns.push({
      title: "Emotion & Wettkampf",
      description:
        "Im Wettkampf wirken Emotionen aktuell eher als Bremse. Wahrnehmen und benennen ist der erste, kostenfreie Trainingsschritt.",
    });
  }
  if (patterns.length === 0) {
    patterns.push({
      title: "Stabiles Startbild",
      description:
        "Es zeigen sich aktuell keine starken Spannungsmuster. Das System kann auf Konsistenz statt auf Krisenintervention bauen.",
    });
  }
  return patterns.slice(0, 4);
}

function buildRecommendations(): {
  title: string;
  description: string;
  duration: string;
  frequency: string;
}[] {
  return [
    {
      title: "Täglicher Check-in — ehrlich, kurz",
      description: "Nutze den Check-in jeden Tag. Ehrlichkeit schlägt Vollständigkeit.",
      duration: "2 Min",
      frequency: "täglich",
    },
    {
      title: "Drei kleine Aufgaben",
      description: "Halte die Tagesaufgaben klein und konkret. Konsistenz gewinnt.",
      duration: "5–15 Min",
      frequency: "täglich",
    },
    {
      title: "Journal als Mustererkennung",
      description: "Nutze das Journal, um Muster sichtbar zu machen — nicht, um perfekt zu schreiben.",
      duration: "3 Min",
      frequency: "an Trainingstagen",
    },
    {
      title: "Rückkehr nach Fehlern",
      description: "Trainiere bewusst die Rückkehr nach Fehlern — Tempo der Wiederaufnahme ist die Skill-Größe.",
      duration: "im Training",
      frequency: "laufend",
    },
    {
      title: "Prozess vor Ergebnis",
      description: "Arbeite mit Prozess- statt Ergebnisdruck. Das schützt Entscheidungsqualität.",
      duration: "—",
      frequency: "laufend",
    },
  ];
}

function buildInnerExcellenceProfile(scores: Record<string, number>) {
  const ie = scores.inner_excellence ?? 50;
  const focus = scores.focus ?? 50;
  const identity = scores.identity ?? 50;
  const emotions = scores.emotions ?? 50;
  const philosophy = scores.philosophy ?? 50;
  const competition = scores.competition ?? 50;
  return {
    growth_mindset_score: clamp((ie + (scores.resilience ?? 50)) / 2),
    presence_level: clamp((focus + ie) / 2),
    ego_freedom_score: clamp((identity + ie) / 2),
    emotional_control_score: clamp((emotions + ie) / 2),
    purpose_orientation_score: clamp((philosophy + (scores.motivation ?? 50)) / 2),
    pressure_regulation_score: clamp((competition + emotions) / 2),
  };
}

export function buildDeterministicQuestionnaireAnalysis(
  answers: Answers,
  _profile?: { sport?: string | null; position?: string | null; level?: string | null }
): DeterministicAnalysis {
  const scores = categoryScores(answers);

  // Mental score: average of available category scores. Fallback 50.
  const vals = Object.values(scores);
  const mental_score = vals.length
    ? clamp(vals.reduce((s, v) => s + v, 0) / vals.length)
    : 50;

  // Sort categories by score (desc).
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);

  const dominant = ranked[0]?.[0] ?? "neurocognition";
  const dominant_category = CATEGORY_LABELS[dominant] ?? dominant;

  // Top strengths: top 2-4 with score >= 60.
  const strongCandidates = ranked.filter(([, v]) => v >= 60).slice(0, 4);
  const strengthsSource = strongCandidates.length >= 2 ? strongCandidates : ranked.slice(0, 3);
  const strengths = strengthsSource.map(([cat]) => {
    const tpl = STRENGTH_TEMPLATES[cat] ?? STRENGTH_TEMPLATES.neurocognition;
    return {
      title: CATEGORY_LABELS[cat] ?? cat,
      description: tpl.description,
      science: tpl.science,
    };
  });

  // Development areas: bottom 2-4 with score <= 55.
  const weakCandidates = [...ranked].reverse().filter(([, v]) => v <= 55).slice(0, 4);
  const devSource = weakCandidates.length >= 2 ? weakCandidates : [...ranked].reverse().slice(0, 3);
  const development_areas = devSource.map(([cat, v]) => {
    const tpl = DEVELOPMENT_TEMPLATES[cat] ?? DEVELOPMENT_TEMPLATES.neurocognition;
    const priority: "high" | "medium" | "low" = v <= 35 ? "high" : v <= 50 ? "medium" : "low";
    return {
      title: CATEGORY_LABELS[cat] ?? cat,
      description: tpl.description,
      priority,
      science: tpl.science,
    };
  });

  const patterns = buildPatterns(scores);
  const recommendations = buildRecommendations();

  const summary = `Dein Startprofil zeigt aktuell einen Schwerpunkt auf "${dominant_category}". Diese Auswertung ist deterministisch aus deinen Antworten gebildet — kein Diagnosewert, sondern Orientierung für dein 56-Tage-System.`;

  // Generic, system-aligned suggestions. Not personalized AI tasks.
  const training_day_tasks = [
    "Vor dem Training: 60 Sekunden ruhig atmen und Tages-Cue setzen.",
    "Im Training: bewusst die Rückkehr nach einem Fehler trainieren.",
    "Nach dem Training: 1 Satz im Journal — was war heute klar?",
  ];
  const rest_day_tasks = [
    "Schlaf priorisieren (Zeit fixieren, Bildschirm reduzieren).",
    "10 Minuten ohne Input: Spaziergang, Atmen, Stille.",
    "Im Journal: ein Muster der Woche benennen.",
  ];

  return {
    summary,
    strengths,
    development_areas,
    patterns,
    recommendations,
    training_day_tasks,
    rest_day_tasks,
    mental_score,
    dominant_category,
    inner_excellence_profile: buildInnerExcellenceProfile(scores),
    source: "deterministic_v1",
  };
}
