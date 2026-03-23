// Validated scientific assessment instruments for Pre/Post measurement

export interface AssessmentItem {
  id: string;
  text: string;
  subscale: string;
  reversed?: boolean;
}

export interface AssessmentInstrument {
  id: string;
  title: string;
  titleShort: string;
  description: string;
  citation: string;
  instructions: string;
  scaleLabels: string[];
  scaleRange: [number, number]; // min, max
  items: AssessmentItem[];
  subscales: { id: string; name: string; description: string }[];
}

// ─── CSAI-2R (Competitive State Anxiety Inventory - Revised) ───
// Measures: Cognitive Anxiety, Somatic Anxiety, Self-Confidence
export const csai2r: AssessmentInstrument = {
  id: "csai2r",
  title: "Competitive State Anxiety Inventory – Revised",
  titleShort: "CSAI-2R",
  description: "Misst deine Wettkampfangst und dein Selbstvertrauen. Entwickelt von Martens et al. (1990), revidiert von Cox et al. (2003).",
  citation: "Cox, R.H., Martens, M.P., & Russell, W.D. (2003). Measuring anxiety in athletics.",
  instructions: "Bitte gib an, wie du dich JETZT in Bezug auf deinen Sport fühlst. Es gibt keine richtigen oder falschen Antworten.",
  scaleLabels: ["Überhaupt nicht", "Etwas", "Mäßig", "Sehr stark"],
  scaleRange: [1, 4],
  subscales: [
    { id: "cognitive_anxiety", name: "Kognitive Angst", description: "Sorgen, negative Erwartungen, Konzentrationsstörungen" },
    { id: "somatic_anxiety", name: "Somatische Angst", description: "Körperliche Symptome von Angst (Herzklopfen, Schwitzen)" },
    { id: "self_confidence", name: "Selbstvertrauen", description: "Vertrauen in die eigenen Fähigkeiten" },
  ],
  items: [
    { id: "csai-1", text: "Ich mache mir Sorgen, dass ich nicht so gut abschneiden werde, wie ich könnte.", subscale: "cognitive_anxiety" },
    { id: "csai-2", text: "Mein Körper fühlt sich angespannt an.", subscale: "somatic_anxiety" },
    { id: "csai-3", text: "Ich bin zuversichtlich, dass ich der Herausforderung gewachsen bin.", subscale: "self_confidence" },
    { id: "csai-4", text: "Ich mache mir Sorgen über Versagen.", subscale: "cognitive_anxiety" },
    { id: "csai-5", text: "Mein Herz rast.", subscale: "somatic_anxiety" },
    { id: "csai-6", text: "Ich bin überzeugt, dass ich gut abschneiden werde.", subscale: "self_confidence" },
    { id: "csai-7", text: "Ich mache mir Sorgen, dass ich mein Ziel nicht erreiche.", subscale: "cognitive_anxiety" },
    { id: "csai-8", text: "Mein Magen fühlt sich unruhig an.", subscale: "somatic_anxiety" },
    { id: "csai-9", text: "Ich bin überzeugt, dass ich unter Druck performen kann.", subscale: "self_confidence" },
    { id: "csai-10", text: "Ich mache mir Sorgen über den Ausgang.", subscale: "cognitive_anxiety" },
    { id: "csai-11", text: "Ich fühle mich körperlich unruhig.", subscale: "somatic_anxiety" },
    { id: "csai-12", text: "Ich bin überzeugt, mein Potenzial abrufen zu können.", subscale: "self_confidence" },
    { id: "csai-13", text: "Ich mache mir Sorgen, unter Druck zu versagen.", subscale: "cognitive_anxiety" },
    { id: "csai-14", text: "Meine Hände sind feucht.", subscale: "somatic_anxiety" },
    { id: "csai-15", text: "Ich bin zuversichtlich, weil ich mich mental auf die Leistung vorbereitet sehe.", subscale: "self_confidence" },
    { id: "csai-16", text: "Ich fühle, dass mein Körper steif ist.", subscale: "somatic_anxiety" },
    { id: "csai-17", text: "Ich vertraue darauf, dass ich auch schwierige Situationen bewältigen kann.", subscale: "self_confidence" },
  ],
};

// ─── SMTQ (Sport Mental Toughness Questionnaire) ───
// Measures: Confidence, Constancy, Control
export const smtq: AssessmentInstrument = {
  id: "smtq",
  title: "Sport Mental Toughness Questionnaire",
  titleShort: "SMTQ",
  description: "Misst deine mentale Stärke im Sport. Entwickelt von Sheard, Golby & van Wersch (2009).",
  citation: "Sheard, M., Golby, J., & van Wersch, A. (2009). Progress toward construct validation of the SMTQ.",
  instructions: "Bitte gib an, wie sehr die folgenden Aussagen auf dich zutreffen.",
  scaleLabels: ["Stimmt überhaupt nicht", "Stimmt eher nicht", "Stimmt eher", "Stimmt völlig"],
  scaleRange: [1, 4],
  subscales: [
    { id: "confidence", name: "Selbstvertrauen", description: "Glaube an eigene Fähigkeiten unter Druck" },
    { id: "constancy", name: "Beständigkeit", description: "Fähigkeit, Verantwortung zu übernehmen und Fokus zu halten" },
    { id: "control", name: "Kontrolle", description: "Emotionsregulation und Umgang mit Unvorhergesehenem" },
  ],
  items: [
    { id: "smtq-1", text: "Ich interpretiere potenzielle Bedrohungen als positive Chancen.", subscale: "confidence" },
    { id: "smtq-2", text: "Ich habe unerschütterliches Vertrauen in meine Fähigkeiten.", subscale: "confidence" },
    { id: "smtq-3", text: "Ich habe Qualitäten, die mich von anderen abheben.", subscale: "confidence" },
    { id: "smtq-4", text: "Ich bin bereit, alles Nötige zu tun, um mein Potenzial auszuschöpfen.", subscale: "constancy" },
    { id: "smtq-5", text: "Ich übernehme Verantwortung für die Festlegung meiner eigenen Ziele.", subscale: "constancy" },
    { id: "smtq-6", text: "Ich gebe alles und bereue es nie.", subscale: "constancy" },
    { id: "smtq-7", text: "Ich bin aufgebracht, wenn Dinge nicht so laufen wie geplant.", subscale: "control", reversed: true },
    { id: "smtq-8", text: "Ich werde ängstlich durch unerwartete Ereignisse.", subscale: "control", reversed: true },
    { id: "smtq-9", text: "Ich fühle mich bedrückt, wenn die Dinge schlecht laufen.", subscale: "control", reversed: true },
    { id: "smtq-10", text: "Ich gewinne an Kraft, wenn ich unter Druck stehe.", subscale: "confidence" },
    { id: "smtq-11", text: "Ich überwinde schwierige Trainingszeiten durch Ausdauer.", subscale: "constancy" },
    { id: "smtq-12", text: "Unter Druck kann ich meine Emotionen kontrollieren.", subscale: "control" },
    { id: "smtq-13", text: "Ich kann schnell zwischen Fokus und Entspannung wechseln.", subscale: "control" },
    { id: "smtq-14", text: "Ich kann den Druck, den ich empfinde, in Antrieb umwandeln.", subscale: "confidence" },
  ],
};

// ─── Short Flow Scale (FKS) ───
// Measures: Flow tendency
export const flowShort: AssessmentInstrument = {
  id: "flow_short",
  title: "Flow-Kurzskala",
  titleShort: "FKS",
  description: "Misst deine Neigung zum Flow-Erleben. Basierend auf Rheinberg, Vollmeyer & Engeser (2003).",
  citation: "Rheinberg, F., Vollmeyer, R., & Engeser, S. (2003). Die Erfassung des Flow-Erlebens.",
  instructions: "Denke an deine typische Trainings- oder Wettkampfsituation. Wie sehr treffen die folgenden Aussagen auf dich zu?",
  scaleLabels: ["Trifft nicht zu", "Trifft eher nicht zu", "Teils/teils", "Trifft eher zu", "Trifft völlig zu"],
  scaleRange: [1, 5],
  subscales: [
    { id: "absorption", name: "Absorption", description: "Völliges Aufgehen in der Tätigkeit" },
    { id: "fluency", name: "Flüssiges Erleben", description: "Glatter, automatischer Handlungsablauf" },
    { id: "anxiety", name: "Besorgnis", description: "Sorge um Leistung (invers)" },
  ],
  items: [
    { id: "fks-1", text: "Ich fühle mich optimal beansprucht.", subscale: "fluency" },
    { id: "fks-2", text: "Meine Gedanken und Handlungen laufen flüssig.", subscale: "fluency" },
    { id: "fks-3", text: "Ich merke gar nicht, wie die Zeit vergeht.", subscale: "absorption" },
    { id: "fks-4", text: "Ich habe keine Mühe, mich zu konzentrieren.", subscale: "fluency" },
    { id: "fks-5", text: "Mein Kopf ist völlig klar.", subscale: "fluency" },
    { id: "fks-6", text: "Ich bin ganz vertieft in das, was ich tue.", subscale: "absorption" },
    { id: "fks-7", text: "Die richtigen Gedanken kommen wie von selbst.", subscale: "fluency" },
    { id: "fks-8", text: "Ich weiß bei jedem Schritt, was ich tun muss.", subscale: "fluency" },
    { id: "fks-9", text: "Ich habe das Gefühl, den Ablauf unter Kontrolle zu haben.", subscale: "fluency" },
    { id: "fks-10", text: "Ich bin völlig selbstvergessen.", subscale: "absorption" },
    { id: "fks-11", text: "Ich mache mir Sorgen über einen Misserfolg.", subscale: "anxiety", reversed: true },
    { id: "fks-12", text: "Ich fühle mich von der Situation überfordert.", subscale: "anxiety", reversed: true },
    { id: "fks-13", text: "Es steht etwas Wichtiges auf dem Spiel und das macht mich nervös.", subscale: "anxiety", reversed: true },
  ],
};

export const allAssessments = [csai2r, smtq, flowShort];

// Scoring function
export function calculateScores(
  instrument: AssessmentInstrument,
  answers: Record<string, number>
): { subscaleScores: Record<string, number>; totalScore: number } {
  const subscaleScores: Record<string, number> = {};
  const subscaleCounts: Record<string, number> = {};

  for (const item of instrument.items) {
    const answer = answers[item.id];
    if (answer == null) continue;

    const [min, max] = instrument.scaleRange;
    const score = item.reversed ? max + min - answer : answer;

    subscaleScores[item.subscale] = (subscaleScores[item.subscale] || 0) + score;
    subscaleCounts[item.subscale] = (subscaleCounts[item.subscale] || 0) + 1;
  }

  // Average per subscale
  for (const key of Object.keys(subscaleScores)) {
    subscaleScores[key] = Math.round((subscaleScores[key] / subscaleCounts[key]) * 100) / 100;
  }

  const values = Object.values(subscaleScores);
  const totalScore = values.length > 0
    ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100
    : 0;

  return { subscaleScores, totalScore };
}
