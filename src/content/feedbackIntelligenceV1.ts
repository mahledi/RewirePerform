export const FEEDBACK_INTELLIGENCE_CONTENT_VERSION = "feedback-intelligence-content-v1.1.2" as const;
export const FEEDBACK_PROGRAM_CONTENT_SOURCE_COMMIT =
  "47519c273f30e73781b827645c726be8e9713db4" as const;
export const FEEDBACK_TEXT_CONSENT_SCOPE = "product-improvement-individual-text-ai-analysis-v1" as const;
export const FEEDBACK_TEXT_CONSENT_VERSION = "feedback-text-consent-v1.1.0-draft" as const;

export type FeedbackCheckpointDay = 10 | 24 | 39 | 55;
export type FeedbackQuestionType = "single" | "multi";

export interface FeedbackOption {
  id: string;
  label: string;
  notScored?: boolean;
  exclusive?: boolean;
}

export interface FeedbackVisibilityRule {
  questionId: string;
  selectedOptionIds: readonly string[];
}

export interface FeedbackQuestionDefinition {
  id: string;
  constructId: string;
  itemFamilyId: string;
  itemVariantId: string;
  scaleId: string;
  type: FeedbackQuestionType;
  prompt: string;
  options: readonly FeedbackOption[];
  optionalComment: true;
  commentLabel?: string;
  visibleWhen?: FeedbackVisibilityRule;
  analysisRole: "repeated_core" | "checkpoint_module" | "quality_context";
}

export interface FeedbackCheckpointDefinition {
  campaignReference: string;
  checkpointDay: FeedbackCheckpointDay;
  phase: 1 | 2 | 3 | 4;
  week: 2 | 4 | 6 | 8;
  language: "de";
  questionnaireVersion: string;
  questionnaireManifestHash: string;
  contentContext: {
    sourceContentCommit: typeof FEEDBACK_PROGRAM_CONTENT_SOURCE_COMMIT;
    programDayContentHash: string;
    toolId: "W2" | "W5" | "W6";
    tool: string;
    cue: string;
    mechanism: string;
    missionTitle: string;
    allowedFeedbackContext: string;
    title: string;
    revealAfterQuestionId?: string;
  };
  heading: string;
  intro: readonly string[];
  durationLabel: string;
  questions: readonly FeedbackQuestionDefinition[];
  closingTextPrompt: string;
  completionTitle: string;
  completionBody: string;
  summaryConstructIds: readonly string[];
}

const fivePoint = (
  labels: readonly [string, string, string, string, string],
): readonly FeedbackOption[] => labels.map((label, index) => ({
  id: String(index + 1),
  label,
}));

const withNotApplicable = (
  options: readonly FeedbackOption[],
  id: string,
  label: string,
): readonly FeedbackOption[] => [...options, { id, label, notScored: true }];

const clarityOptions = fivePoint([
  "Sehr verständlich",
  "Eher verständlich",
  "Teils/teils",
  "Eher schwer verständlich",
  "Sehr schwer verständlich",
]);

const clearOptions = fivePoint([
  "Vollkommen klar",
  "Eher klar",
  "Teils/teils",
  "Eher unklar",
  "Sehr unklar",
]);

const amountOptions = fivePoint([
  "Viel zu wenig",
  "Eher wenig",
  "Genau richtig",
  "Eher viel",
  "Viel zu viel",
]);

const durationOptions = fivePoint([
  "Viel zu kurz",
  "Eher kurz",
  "Genau richtig",
  "Eher lang",
  "Viel zu lang",
]);

const easeOptions = fivePoint([
  "Sehr leicht",
  "Eher leicht",
  "Teils/teils",
  "Eher schwer",
  "Sehr schwer",
]);

const fitOptions = fivePoint([
  "Sehr gut",
  "Eher gut",
  "Teils/teils",
  "Eher schlecht",
  "Gar nicht gut",
]);

const affinityOptions = fivePoint([
  "Sehr gerne",
  "Eher gerne",
  "Unterschiedlich",
  "Eher ungern",
  "Gar nicht gerne",
]);

const frequencyOptions = fivePoint(["Nie", "Selten", "Manchmal", "Oft", "Sehr oft"]);
const magnitudeOptions = fivePoint(["Gar nicht", "Eher wenig", "Teilweise", "Deutlich", "Sehr deutlich"]);

const changeValenceOptions: readonly FeedbackOption[] = [
  { id: "strongly_helpful", label: "Deutlich hilfreich" },
  { id: "rather_helpful", label: "Eher hilfreich" },
  { id: "neutral", label: "Weder hilfreich noch störend" },
  { id: "rather_disruptive", label: "Eher störend" },
  { id: "strongly_disruptive", label: "Deutlich störend" },
  { id: "depends", label: "Unterschiedlich je nach Situation", notScored: true },
];

const restVisualizationOptions = (
  labels: readonly [string, string, string, string, string],
): readonly FeedbackOption[] => withNotApplicable(
  fivePoint(labels),
  "not_used",
  "Noch nicht genutzt",
);

const optionalComment = { optionalComment: true as const };

const day10Questions: readonly FeedbackQuestionDefinition[] = [
  {
    id: "d10_content_clarity",
    constructId: "content_clarity",
    itemFamilyId: "content_clarity_v1",
    itemVariantId: "content_clarity_d10_v1",
    scaleId: "content_clarity_5_v1",
    type: "single",
    prompt: "Wie verständlich sind die täglichen Inhalte bisher für dich?",
    options: clarityOptions,
    ...optionalComment,
    analysisRole: "repeated_core",
  },
  {
    id: "d10_task_clarity",
    constructId: "task_clarity",
    itemFamilyId: "task_clarity_v1",
    itemVariantId: "task_clarity_d10_v1",
    scaleId: "task_actionability_5_v1",
    type: "single",
    prompt: "Wenn eine Aufgabe erscheint: Wie klar ist dir, was du konkret tun sollst?",
    options: clearOptions,
    ...optionalComment,
    analysisRole: "repeated_core",
  },
  {
    id: "d10_text_load",
    constructId: "text_load",
    itemFamilyId: "text_load_v1",
    itemVariantId: "text_load_d10_v1",
    scaleId: "amount_bipolar_5_v1",
    type: "single",
    prompt: "Wie fühlt sich die Textmenge an einem normalen Programmtag an?",
    options: amountOptions,
    ...optionalComment,
    analysisRole: "repeated_core",
  },
  {
    id: "d10_daily_duration",
    constructId: "daily_duration",
    itemFamilyId: "daily_duration_v1",
    itemVariantId: "daily_duration_d10_v1",
    scaleId: "duration_bipolar_5_v1",
    type: "single",
    prompt: "Wie passt die Dauer eines täglichen Durchgangs für dich?",
    options: durationOptions,
    ...optionalComment,
    analysisRole: "checkpoint_module",
  },
  {
    id: "d10_flow_clarity",
    constructId: "flow_clarity",
    itemFamilyId: "flow_clarity_v1",
    itemVariantId: "flow_clarity_d10_v1",
    scaleId: "ease_5_v1",
    type: "single",
    prompt: "Wie leicht findest du dich im Ablauf eines Programmtages zurecht?",
    options: easeOptions,
    ...optionalComment,
    analysisRole: "checkpoint_module",
  },
  {
    id: "d10_trial_ease",
    constructId: "trial_ease",
    itemFamilyId: "trial_ease_v1",
    itemVariantId: "trial_ease_d10_v1",
    scaleId: "ease_5_not_tried_v1",
    type: "single",
    prompt: "Wie leicht kannst du die Aufgaben bisher in deinem Alltag ausprobieren?",
    options: withNotApplicable(easeOptions, "not_tried", "Noch nicht ausprobiert"),
    ...optionalComment,
    analysisRole: "checkpoint_module",
  },
  {
    id: "d10_rest_visualization_guidance_clarity",
    constructId: "rest_visualization_guidance_clarity",
    itemFamilyId: "rest_visualization_guidance_clarity_v1",
    itemVariantId: "rest_visualization_guidance_clarity_d10_v1",
    scaleId: "subjective_experience_5_not_used_v1",
    type: "single",
    prompt: "Wie klar war dir bei der Visualisierung am Ruhetag, was du dir Schritt für Schritt vorstellen solltest?",
    options: restVisualizationOptions([
      "Vollkommen klar", "Eher klar", "Teils/teils", "Eher unklar", "Sehr unklar",
    ]),
    ...optionalComment,
    analysisRole: "checkpoint_module",
  },
  {
    id: "d10_rest_visualization_practical_access",
    constructId: "rest_visualization_practical_access",
    itemFamilyId: "rest_visualization_practical_access_v1",
    itemVariantId: "rest_visualization_practical_access_d10_v1",
    scaleId: "subjective_experience_5_not_used_v1",
    type: "single",
    prompt: "Wie leicht konntest du dir die vorgegebene Sportsituation vorstellen und darin die nächste Handlung durchgehen?",
    options: restVisualizationOptions([
      "Sehr leicht", "Eher leicht", "Teils/teils", "Eher schwer", "Sehr schwer",
    ]),
    ...optionalComment,
    analysisRole: "checkpoint_module",
  },
  {
    id: "d10_daily_fit",
    constructId: "daily_fit",
    itemFamilyId: "daily_fit_v1",
    itemVariantId: "daily_fit_d10_v1",
    scaleId: "fit_5_v1",
    type: "single",
    prompt: "Wie gut passt RewirePerform bisher neben Training, Wettkampf und Alltag?",
    options: fitOptions,
    ...optionalComment,
    analysisRole: "repeated_core",
  },
  {
    id: "d10_program_affinity",
    constructId: "program_affinity",
    itemFamilyId: "program_affinity_v1",
    itemVariantId: "program_affinity_d10_v1",
    scaleId: "affinity_5_v1",
    type: "single",
    prompt: "Wie gerne öffnest du RewirePerform aktuell?",
    options: affinityOptions,
    ...optionalComment,
    analysisRole: "repeated_core",
  },
  {
    id: "d10_improvement_priority",
    constructId: "improvement_priority",
    itemFamilyId: "improvement_priority_d10_v1",
    itemVariantId: "improvement_priority_d10_v1",
    scaleId: "improvement_area_d10_v1",
    type: "single",
    prompt: "Was sollten wir zuerst einfacher oder besser machen?",
    options: [
      "Texte", "Aufgaben", "Täglicher Ablauf", "Benötigte Zeit", "Anwendung im Alltag",
      "Technische Nutzung", "Etwas anderes", "Momentan kein klarer Punkt",
    ].map((label, index) => ({ id: String(index + 1), label, notScored: true })),
    ...optionalComment,
    analysisRole: "quality_context",
  },
];

const day24Questions: readonly FeedbackQuestionDefinition[] = [
  {
    id: "d24_content_clarity", constructId: "content_clarity", itemFamilyId: "content_clarity_v1",
    itemVariantId: "content_clarity_d24_v1", scaleId: "content_clarity_5_v1", type: "single",
    prompt: "Wenn du die täglichen Inhalte liest: Wie klar ist dir inzwischen, was du daraus mitnehmen sollst?",
    options: clearOptions, ...optionalComment, analysisRole: "repeated_core",
  },
  {
    id: "d24_task_clarity", constructId: "task_clarity", itemFamilyId: "task_clarity_v1",
    itemVariantId: "task_clarity_d24_v1", scaleId: "task_actionability_5_v1", type: "single",
    prompt: "Wie schnell verstehst du momentan, wie du eine Aufgabe praktisch umsetzen sollst?",
    options: fivePoint(["Sofort", "Meistens schnell", "Unterschiedlich", "Eher langsam", "Oft gar nicht"]),
    ...optionalComment, analysisRole: "repeated_core",
  },
  {
    id: "d24_text_load", constructId: "text_load", itemFamilyId: "text_load_v1",
    itemVariantId: "text_load_d24_v1", scaleId: "amount_bipolar_5_v1", type: "single",
    prompt: "Wie wirkt die tägliche Textmenge inzwischen auf dich?", options: amountOptions,
    ...optionalComment, analysisRole: "repeated_core",
  },
  {
    id: "d24_daily_fit", constructId: "daily_fit", itemFamilyId: "daily_fit_v1",
    itemVariantId: "daily_fit_d24_v1", scaleId: "fit_5_v1", type: "single",
    prompt: "Wie gut lässt sich RewirePerform momentan mit Training, Wettkampf und Alltag verbinden?",
    options: fitOptions, ...optionalComment, analysisRole: "repeated_core",
  },
  {
    id: "d24_program_affinity", constructId: "program_affinity", itemFamilyId: "program_affinity_v1",
    itemVariantId: "program_affinity_d24_v1", scaleId: "affinity_5_v1", type: "single",
    prompt: "Wie gerne arbeitest du aktuell mit dem Programm?", options: affinityOptions,
    ...optionalComment, analysisRole: "repeated_core",
  },
  {
    id: "d24_rest_visualization_guidance_clarity",
    constructId: "rest_visualization_guidance_clarity",
    itemFamilyId: "rest_visualization_guidance_clarity_v1",
    itemVariantId: "rest_visualization_guidance_clarity_d24_v1",
    scaleId: "subjective_experience_5_not_used_v1",
    type: "single",
    prompt: "Wie klar führt dich die Visualisierung am Ruhetag durch die Sportsituation bis zu deinem Satz und deiner nächsten Handlung?",
    options: restVisualizationOptions([
      "Vollkommen klar", "Eher klar", "Teils/teils", "Eher unklar", "Sehr unklar",
    ]),
    ...optionalComment,
    analysisRole: "checkpoint_module",
  },
  {
    id: "d24_rest_visualization_practical_access",
    constructId: "rest_visualization_practical_access",
    itemFamilyId: "rest_visualization_practical_access_v1",
    itemVariantId: "rest_visualization_practical_access_d24_v1",
    scaleId: "subjective_experience_5_not_used_v1",
    type: "single",
    prompt: "Wie klar ist dir nach der Visualisierung, welche konkrete Handlung du bei einer späteren realen Gelegenheit ausprobieren willst?",
    options: restVisualizationOptions([
      "Vollkommen klar", "Eher klar", "Teils/teils", "Eher unklar", "Sehr unklar",
    ]),
    ...optionalComment,
    analysisRole: "checkpoint_module",
  },
  {
    id: "d24_training_transfer", constructId: "training_transfer", itemFamilyId: "training_transfer_v1",
    itemVariantId: "training_transfer_d24_v1", scaleId: "training_transfer_frequency_5_v1", type: "single",
    prompt: "Wie häufig nimmst du einen Gedanken oder eine Aufgabe aus RewirePerform mit ins Training?",
    options: withNotApplicable(frequencyOptions, "no_opportunity", "Noch keine passende Trainingssituation"),
    ...optionalComment, analysisRole: "repeated_core",
  },
  {
    id: "d24_self_learning", constructId: "self_learning", itemFamilyId: "self_learning_v1",
    itemVariantId: "self_learning_d24_v1", scaleId: "magnitude_5_v1", type: "single",
    prompt: "Wie stark hilft dir RewirePerform bisher, dein eigenes Verhalten im Sport bewusster zu verstehen?",
    options: magnitudeOptions, ...optionalComment, analysisRole: "repeated_core",
  },
  {
    id: "d24_helpful_components", constructId: "helpful_components", itemFamilyId: "helpful_components_d24_v1",
    itemVariantId: "helpful_components_d24_v1", scaleId: "components_d24_multi_v1", type: "multi",
    prompt: "Welche Bestandteile helfen dir bisher, Entwicklungen bei dir zu bemerken?",
    options: ["Tägliche Inhalte", "Aufgaben", "Check-ins", "Journal", "Rückblicke", "Keiner davon", "Etwas anderes"]
      .map((label, index) => ({
        id: String(index + 1), label, notScored: true, exclusive: label === "Keiner davon",
      })),
    ...optionalComment, analysisRole: "checkpoint_module",
  },
  {
    id: "d24_change_magnitude", constructId: "perceived_change_magnitude",
    itemFamilyId: "perceived_change_magnitude_v1", itemVariantId: "change_magnitude_d24_v1",
    scaleId: "perceived_change_magnitude_5_v1", type: "single",
    prompt: "Wie stark nimmst du seit dem Start eine Veränderung in deinem Umgang mit sportlichen Situationen wahr?",
    options: magnitudeOptions, ...optionalComment, analysisRole: "repeated_core",
  },
  {
    id: "d24_change_valence", constructId: "perceived_change_valence",
    itemFamilyId: "perceived_change_valence_v1", itemVariantId: "change_valence_d24_v1",
    scaleId: "change_valence_6_v1", type: "single", prompt: "Wie fühlt sich diese Veränderung für dich an?",
    options: changeValenceOptions, ...optionalComment,
    visibleWhen: { questionId: "d24_change_magnitude", selectedOptionIds: ["2", "3", "4", "5"] },
    analysisRole: "repeated_core",
  },
  {
    id: "d24_low_energy_fit", constructId: "low_energy_fit", itemFamilyId: "low_energy_fit_v1",
    itemVariantId: "low_energy_fit_d24_v1", scaleId: "fit_5_not_experienced_v1", type: "single",
    prompt: "Wie gut funktioniert RewirePerform für dich an Tagen, an denen wenig Energie oder Motivation da ist?",
    options: withNotApplicable(fitOptions, "not_experienced", "Noch nicht erlebt"),
    ...optionalComment, analysisRole: "checkpoint_module",
  },
  {
    id: "d24_improvement_priority", constructId: "improvement_priority", itemFamilyId: "improvement_priority_d24_v1",
    itemVariantId: "improvement_priority_d24_v1", scaleId: "improvement_area_d24_v1", type: "single",
    prompt: "Was würde dir im nächsten Abschnitt am meisten helfen?",
    options: ["Klarere Texte", "Konkretere Aufgaben", "Weniger täglicher Umfang", "Mehr Hilfe bei der Anwendung", "Bessere Rückblicke", "Einfacherer Ablauf", "Etwas anderes"]
      .map((label, index) => ({ id: String(index + 1), label, notScored: true })),
    ...optionalComment, analysisRole: "quality_context",
  },
];

const day39Questions: readonly FeedbackQuestionDefinition[] = [
  {
    id: "d39_content_clarity", constructId: "content_clarity", itemFamilyId: "content_clarity_v1",
    itemVariantId: "content_clarity_d39_v1", scaleId: "content_clarity_5_v1", type: "single",
    prompt: "Wie sicher verstehst du inzwischen, wozu die täglichen Inhalte und Aufgaben gedacht sind?",
    options: fivePoint(["Sehr sicher", "Eher sicher", "Teils/teils", "Eher unsicher", "Sehr unsicher"]),
    ...optionalComment, analysisRole: "repeated_core",
  },
  {
    id: "d39_daily_fit", constructId: "daily_fit", itemFamilyId: "daily_fit_v1",
    itemVariantId: "daily_fit_d39_v1", scaleId: "fit_5_v1", type: "single",
    prompt: "Wie gut fügt sich RewirePerform gerade in deinen Sportalltag ein?", options: fitOptions,
    ...optionalComment, analysisRole: "repeated_core",
  },
  {
    id: "d39_program_affinity", constructId: "program_affinity", itemFamilyId: "program_affinity_v1",
    itemVariantId: "program_affinity_d39_v1", scaleId: "affinity_5_v1", type: "single",
    prompt: "Wie gerne nutzt du RewirePerform in dieser Phase?", options: affinityOptions,
    ...optionalComment, analysisRole: "repeated_core",
  },
  {
    id: "d39_rest_visualization_self_direction",
    constructId: "rest_visualization_self_direction",
    itemFamilyId: "rest_visualization_self_direction_v1",
    itemVariantId: "rest_visualization_self_direction_d39_v1",
    scaleId: "subjective_experience_5_not_used_v1",
    type: "single",
    prompt: "Wie selbstständig kannst du inzwischen in der Visualisierung deinen heutigen Satz zurückholen und in der Sportsituation nutzen?",
    options: restVisualizationOptions([
      "Ganz selbstständig", "Eher selbstständig", "Teils/teils", "Eher nur mit Führung", "Nur mit vollständiger Führung",
    ]),
    ...optionalComment,
    analysisRole: "checkpoint_module",
  },
  {
    id: "d39_rest_visualization_practical_access",
    constructId: "rest_visualization_practical_access",
    itemFamilyId: "rest_visualization_practical_access_v1",
    itemVariantId: "rest_visualization_practical_access_d39_v1",
    scaleId: "subjective_experience_5_not_used_v1",
    type: "single",
    prompt: "Wie klar kannst du am Ende der Visualisierung benennen, was du bei der nächsten realen Gelegenheit tun willst?",
    options: restVisualizationOptions([
      "Vollkommen klar", "Eher klar", "Teils/teils", "Eher unklar", "Sehr unklar",
    ]),
    ...optionalComment,
    analysisRole: "checkpoint_module",
  },
  {
    id: "d39_training_transfer", constructId: "training_transfer", itemFamilyId: "training_transfer_v1",
    itemVariantId: "training_transfer_d39_v1", scaleId: "training_transfer_frequency_5_v1", type: "single",
    prompt: "Wie häufig setzt du im Sport bewusst etwas ein, das du bei RewirePerform kennengelernt hast?",
    options: withNotApplicable(frequencyOptions, "no_opportunity", "Noch keine passende Situation"),
    ...optionalComment, analysisRole: "repeated_core",
  },
  {
    id: "d39_retrieval_access", constructId: "retrieval_access", itemFamilyId: "retrieval_access_v1",
    itemVariantId: "retrieval_access_d39_v1", scaleId: "ease_5_v1", type: "single",
    prompt: "Wenn du im Sport etwas aus RewirePerform gebrauchen könntest: Wie leicht fällt dir ein passender Gedanke oder eine passende Handlung ein?",
    options: easeOptions, ...optionalComment, analysisRole: "repeated_core",
  },
  {
    id: "d39_automaticity_stage", constructId: "automaticity_stage", itemFamilyId: "automaticity_stage_v1",
    itemVariantId: "automaticity_stage_d39_v1", scaleId: "automaticity_stage_5_v1", type: "single",
    prompt: "Wenn du in einer schwierigen Sportsituation etwas aus RewirePerform nutzt: Wie beginnt es meistens?",
    options: [
      "Ich öffne zuerst RewirePerform", "Ich versuche bewusst, mich zu erinnern",
      "Ein passender Gedanke fällt mir schnell ein", "Ich handle manchmal anders, ohne lange darüber nachzudenken",
      "Ich nutze bisher nichts davon",
    ].map((label, index) => ({ id: String(index + 1), label, notScored: index === 4 })),
    ...optionalComment, analysisRole: "repeated_core",
  },
  {
    id: "d39_self_learning", constructId: "self_learning", itemFamilyId: "self_learning_v1",
    itemVariantId: "self_learning_d39_v1", scaleId: "magnitude_5_v1", type: "single",
    prompt: "Wie stark hast du durch das Programm bisher etwas über deine eigenen Reaktionen und Muster gelernt?",
    options: magnitudeOptions, ...optionalComment, analysisRole: "repeated_core",
  },
  {
    id: "d39_change_magnitude", constructId: "perceived_change_magnitude",
    itemFamilyId: "perceived_change_magnitude_v1", itemVariantId: "change_magnitude_d39_v1",
    scaleId: "perceived_change_magnitude_5_v1", type: "single",
    prompt: "Wie deutlich bemerkst du inzwischen einen Unterschied in deinem Umgang mit schwierigen sportlichen Situationen?",
    options: magnitudeOptions, ...optionalComment, analysisRole: "repeated_core",
  },
  {
    id: "d39_change_valence", constructId: "perceived_change_valence",
    itemFamilyId: "perceived_change_valence_v1", itemVariantId: "change_valence_d39_v1",
    scaleId: "change_valence_6_v1", type: "single", prompt: "Wie fühlt sich dieser Unterschied für dich an?",
    options: changeValenceOptions, ...optionalComment,
    visibleWhen: { questionId: "d39_change_magnitude", selectedOptionIds: ["2", "3", "4", "5"] },
    analysisRole: "repeated_core",
  },
  {
    id: "d39_application_context", constructId: "application_context", itemFamilyId: "application_context_v1",
    itemVariantId: "application_context_d39_v1", scaleId: "application_context_multi_v1", type: "multi",
    prompt: "Wo hast du bisher etwas aus RewirePerform genutzt?",
    options: ["Training", "Wettkampf", "Ruhetag", "Außerhalb des Sports", "Noch nicht genutzt"]
      .map((label, index) => ({
        id: String(index + 1), label, notScored: true, exclusive: label === "Noch nicht genutzt",
      })),
    ...optionalComment, analysisRole: "checkpoint_module",
  },
  {
    id: "d39_standard_return", constructId: "standard_return", itemFamilyId: "standard_return_v1",
    itemVariantId: "standard_return_d39_v1", scaleId: "frequency_5_no_opportunity_v1", type: "single",
    prompt: "Wenn ein Training oder Wettkampf gut oder schlecht läuft: Wie häufig findest du bewusst zu deinem Standard für die nächste Aktion zurück?",
    options: withNotApplicable(frequencyOptions, "no_opportunity", "Noch keine passende Situation"),
    ...optionalComment, analysisRole: "checkpoint_module",
  },
  {
    id: "d39_main_barrier", constructId: "main_barrier", itemFamilyId: "main_barrier_v1",
    itemVariantId: "main_barrier_d39_v1", scaleId: "barrier_d39_v1", type: "single",
    prompt: "Was bremst dich aktuell am meisten dabei, RewirePerform wirklich zu nutzen?",
    options: ["Fehlende Zeit", "Zu viel Text", "Unklare Aufgabe", "Passt nicht zur Situation", "Ich erinnere mich nicht daran", "Wirkt für mich nicht relevant", "Technische Hürde", "Momentan nichts", "Etwas anderes"]
      .map((label, index) => ({ id: String(index + 1), label, notScored: true })),
    ...optionalComment, analysisRole: "quality_context",
  },
];

const day55Questions: readonly FeedbackQuestionDefinition[] = [
  {
    id: "d55_free_recall_level", constructId: "free_recall", itemFamilyId: "free_recall_v1",
    itemVariantId: "free_recall_d55_v1", scaleId: "free_recall_stage_5_v1", type: "single",
    prompt: "Ohne noch einmal in der App nachzusehen: Wie viel aus RewirePerform kannst du gerade frei abrufen?",
    options: [
      "Mir fällt nichts Konkretes ein", "Ein einzelner Gedanke", "Mehrere Gedanken, aber noch unscharf",
      "Mehrere konkrete Sätze oder Werkzeuge", "Ich kann mehrere Werkzeuge gezielt abrufen",
    ].map((label, index) => ({ id: String(index + 1), label })),
    ...optionalComment, commentLabel: "+ Aufschreiben, was dir gerade einfällt", analysisRole: "checkpoint_module",
  },
  {
    id: "d55_retention_gap", constructId: "retention_gap", itemFamilyId: "retention_gap_v1",
    itemVariantId: "retention_gap_d55_v1", scaleId: "retention_gap_frequency_5_v1", type: "single",
    prompt: "Wie oft gab es Inhalte, die du beim Lesen verstanden hast, später aber nicht mehr abrufen konntest?",
    options: frequencyOptions, ...optionalComment, analysisRole: "checkpoint_module",
  },
  {
    id: "d55_retrieval_access", constructId: "retrieval_access", itemFamilyId: "retrieval_access_v1",
    itemVariantId: "retrieval_access_d55_v1", scaleId: "ease_5_v1", type: "single",
    prompt: "Wenn du heute im Sport etwas aus RewirePerform brauchst: Wie leicht findest du einen passenden Gedanken oder eine passende Handlung?",
    options: easeOptions, ...optionalComment, analysisRole: "repeated_core",
  },
  {
    id: "d55_rest_visualization_integration",
    constructId: "rest_visualization_integration",
    itemFamilyId: "rest_visualization_integration_v1",
    itemVariantId: "rest_visualization_integration_d55_v1",
    scaleId: "subjective_experience_5_not_used_v1",
    type: "single",
    prompt: "Rückblickend: Wie gut konntest du die Visualisierungen an Ruhetagen nutzen, um deine RewirePerform-Sätze in konkreten Sportsituationen durchzugehen?",
    options: restVisualizationOptions([
      "Sehr gut", "Eher gut", "Teils/teils", "Eher schlecht", "Gar nicht gut",
    ]),
    ...optionalComment,
    analysisRole: "checkpoint_module",
  },
  {
    id: "d55_rest_visualization_continuation_intent",
    constructId: "rest_visualization_continuation_intent",
    itemFamilyId: "rest_visualization_continuation_intent_v1",
    itemVariantId: "rest_visualization_continuation_intent_d55_v1",
    scaleId: "subjective_experience_5_not_used_v1",
    type: "single",
    prompt: "Wie wahrscheinlich ist es, dass du solche Visualisierungen nach dem Programm selbstständig weiter nutzt?",
    options: restVisualizationOptions([
      "Sehr wahrscheinlich", "Eher wahrscheinlich", "Noch unklar", "Eher unwahrscheinlich", "Sehr unwahrscheinlich",
    ]),
    ...optionalComment,
    analysisRole: "quality_context",
  },
  {
    id: "d55_automaticity_stage", constructId: "automaticity_stage", itemFamilyId: "automaticity_stage_v1",
    itemVariantId: "automaticity_stage_d55_v1", scaleId: "automaticity_stage_5_v1", type: "single",
    prompt: "Wenn eine passende Situation entsteht: Wie kommt RewirePerform heute meistens ins Spiel?",
    options: [
      "Ich müsste zuerst in der App nachsehen", "Ich suche bewusst nach einem passenden Werkzeug",
      "Mir fällt schnell etwas Passendes ein", "Ein passender Gedanke oder eine Handlung kommt häufig von selbst",
      "Ich nutze bisher nichts davon",
    ].map((label, index) => ({ id: String(index + 1), label, notScored: index === 4 })),
    ...optionalComment, analysisRole: "repeated_core",
  },
  {
    id: "d55_training_transfer", constructId: "training_transfer", itemFamilyId: "training_transfer_v1",
    itemVariantId: "training_transfer_d55_v1", scaleId: "training_transfer_frequency_5_v1", type: "single",
    prompt: "Wie häufig hast du während des Programms bewusst etwas aus RewirePerform eingesetzt?",
    options: frequencyOptions, ...optionalComment, analysisRole: "repeated_core",
  },
  {
    id: "d55_application_context", constructId: "application_context", itemFamilyId: "application_context_v1",
    itemVariantId: "application_context_d55_v1", scaleId: "application_context_multi_v1", type: "multi",
    prompt: "Wo hast du Inhalte oder Aufgaben eingesetzt?",
    options: ["Training", "Wettkampf", "Ruhetag", "Außerhalb des Sports", "Noch nicht eingesetzt"]
      .map((label, index) => ({
        id: String(index + 1), label, notScored: true, exclusive: label === "Noch nicht eingesetzt",
      })),
    ...optionalComment, analysisRole: "checkpoint_module",
  },
  {
    id: "d55_self_learning", constructId: "self_learning", itemFamilyId: "self_learning_v1",
    itemVariantId: "self_learning_d55_v1", scaleId: "magnitude_5_v1", type: "single",
    prompt: "Wie stark hat dir das Programm geholfen, deine eigenen Reaktionen und Muster besser zu verstehen?",
    options: magnitudeOptions, ...optionalComment, analysisRole: "repeated_core",
  },
  {
    id: "d55_change_magnitude", constructId: "perceived_change_magnitude",
    itemFamilyId: "perceived_change_magnitude_v1", itemVariantId: "change_magnitude_d55_v1",
    scaleId: "perceived_change_magnitude_5_v1", type: "single",
    prompt: "Wie deutlich nimmst du im Vergleich zum Programmstart eine Veränderung in deinem Umgang mit sportlichen Situationen wahr?",
    options: magnitudeOptions, ...optionalComment, analysisRole: "repeated_core",
  },
  {
    id: "d55_change_valence", constructId: "perceived_change_valence",
    itemFamilyId: "perceived_change_valence_v1", itemVariantId: "change_valence_d55_v1",
    scaleId: "change_valence_6_v1", type: "single", prompt: "Wie fühlt sich diese Veränderung für dich an?",
    options: changeValenceOptions, ...optionalComment,
    visibleWhen: { questionId: "d55_change_magnitude", selectedOptionIds: ["2", "3", "4", "5"] },
    analysisRole: "repeated_core",
  },
  {
    id: "d55_overall_helpfulness", constructId: "overall_helpfulness", itemFamilyId: "overall_helpfulness_v1",
    itemVariantId: "overall_helpfulness_d55_v1", scaleId: "helpfulness_5_v1", type: "single",
    prompt: "Wie hilfreich war RewirePerform insgesamt für deinen Sportalltag?",
    options: fivePoint(["Sehr hilfreich", "Eher hilfreich", "Teilweise hilfreich", "Eher nicht hilfreich", "Gar nicht hilfreich"]),
    ...optionalComment, analysisRole: "checkpoint_module",
  },
  {
    id: "d55_helpful_components", constructId: "helpful_components", itemFamilyId: "helpful_components_d55_v1",
    itemVariantId: "helpful_components_d55_v1", scaleId: "components_d55_multi_v1", type: "multi",
    prompt: "Welche Bestandteile haben dir am meisten gebracht?",
    options: ["Tägliche Inhalte", "Aufgaben", "Check-ins", "Journal", "Rückblicke", "Transfer-Pulse", "Keiner davon", "Etwas anderes"]
      .map((label, index) => ({
        id: String(index + 1), label, notScored: true, exclusive: label === "Keiner davon",
      })),
    ...optionalComment, analysisRole: "checkpoint_module",
  },
  {
    id: "d55_overall_fit", constructId: "daily_fit", itemFamilyId: "daily_fit_v1",
    itemVariantId: "daily_fit_d55_v1", scaleId: "fit_5_v1", type: "single",
    prompt: "Wie gut hat das Programm insgesamt neben Training, Wettkampf und Alltag funktioniert?",
    options: fitOptions, ...optionalComment, analysisRole: "repeated_core",
  },
  {
    id: "d55_keep_priority", constructId: "keep_priority", itemFamilyId: "keep_priority_v1",
    itemVariantId: "keep_priority_d55_v1", scaleId: "keep_area_d55_multi_v1", type: "multi",
    prompt: "Was sollte in RewirePerform unbedingt erhalten bleiben?",
    options: ["Kurze Inhalte", "Ausführliche Erklärungen", "Aufgaben", "Check-ins", "Journal", "Rückblicke und Wiederholungen", "Tägliche Struktur", "Etwas anderes"]
      .map((label, index) => ({ id: String(index + 1), label, notScored: true })),
    ...optionalComment, analysisRole: "quality_context",
  },
  {
    id: "d55_change_priority", constructId: "improvement_priority", itemFamilyId: "improvement_priority_d55_v1",
    itemVariantId: "improvement_priority_d55_v1", scaleId: "improvement_area_d55_v1", type: "single",
    prompt: "Was sollten wir als Erstes verändern?",
    options: ["Texte", "Aufgaben", "Täglicher Umfang", "Wiederholungen", "Anwendung im Sport", "Journal-/Check-in-Ablauf", "Navigation", "Etwas anderes", "Momentan kein klarer Punkt"]
      .map((label, index) => ({ id: String(index + 1), label, notScored: true })),
    ...optionalComment, analysisRole: "quality_context",
  },
];

export const feedbackTextConsentCopy = {
  title: "Mach RewirePerform mit deinem Feedback besser",
  body: [
    "Ein kurzer Kommentar zeigt uns genauer, was für dich klar ist, was dir hilft und was wir verbessern sollten.",
    "Wenn du zustimmst, darf RewirePerform ihn einzeln mit deinen strukturierten Feedback- und Aktivitätsdaten auswerten. Im Analyseexport stehen weder dein Name noch deine E-Mail-Adresse. Die Auswertung läuft im intern betriebenen Jarvis-System; kein externer KI-Anbieter erhält deinen Kommentar.",
    "Dein Coach sieht ihn nicht. Wir nutzen ihn nicht für Werbung, Personalisierung oder automatische Entscheidungen über dich. Du kannst deine Einwilligung jederzeit in den Einstellungen widerrufen.",
  ],
  acceptLabel: "Ja, mit Feedback verbessern",
  declineLabel: "Nur Auswahlantwort senden",
} as const;

export const FEEDBACK_CHECKPOINTS: Record<FeedbackCheckpointDay, FeedbackCheckpointDefinition> = {
  10: {
    campaignReference: "feedback-day-10-v1",
    checkpointDay: 10, phase: 1, week: 2, language: "de", questionnaireVersion: "feedback-d10-v1.1.2",
    questionnaireManifestHash: "48c2bf887ec96a0cc49eb327b380f7da7d163beb08929b9b359bfa0356692f2c",
    contentContext: {
      sourceContentCommit: FEEDBACK_PROGRAM_CONTENT_SOURCE_COMMIT,
      programDayContentHash: "ab0c29e4319a1885167d0478bb696874a0aa665e2a885532382d825e715b2078",
      toolId: "W6",
      tool: "Unsicherheit prüfen",
      cue: "Prüfen. Dann ausprobieren.",
      mechanism: "Unsicherheit sagt noch nicht, was richtig ist.",
      missionTitle: "Eine passende Herausforderung wählen",
      allowedFeedbackContext: "Entscheidung unter Unsicherheit, Sicherheits- und Aufgabenprüfung sowie kontrollierter Versuch. Keine Behauptung, Unsicherheit müsse überwunden werden.",
      title: "Prüfen, dann ausprobieren",
    },
    heading: "Tag 10 – dein erster echter Eindruck",
    intro: [
      "Du hast die ersten Bausteine von RewirePerform kennengelernt. Jetzt wollen wir wissen, wie sich das System für dich wirklich anfühlt: Was ist klar, was macht den Einstieg schwer und was müssen wir einfacher machen?",
      "Wir wollen RewirePerform nicht schönreden. Kritik ist ausdrücklich erwünscht. Deine ehrliche Sicht hilft uns, das Programm für dich und andere Athletinnen und Athleten besser zu machen.",
    ],
    durationLabel: "Etwa 3 Minuten", questions: day10Questions,
    closingTextPrompt: "Was möchtest du uns zu deinen ersten Tagen noch mitgeben?",
    completionTitle: "Danke für deinen ersten Eindruck.",
    completionBody: "Deine ehrliche Rückmeldung hilft uns, den Einstieg in RewirePerform klarer und angenehmer zu machen.",
    summaryConstructIds: [],
  },
  24: {
    campaignReference: "feedback-day-24-v1",
    checkpointDay: 24, phase: 2, week: 4, language: "de", questionnaireVersion: "feedback-d24-v1.1.2",
    questionnaireManifestHash: "679f09ab0a4c08a0521404cbbef2d88a8f0121cb353c42f310a3f09cc20689e8",
    contentContext: {
      sourceContentCommit: FEEDBACK_PROGRAM_CONTENT_SOURCE_COMMIT,
      programDayContentHash: "71f740604c9a0edd646b4d2b86bb890b380e6a3f97dd1b62dbbee3a09150c281",
      toolId: "W2",
      tool: "Die Aufgabe zählt",
      cue: "Was braucht die Aufgabe?",
      mechanism: "Konkrete Handlungen zeigen dir, was du bereits umgesetzt hast.",
      missionTitle: "Eine Handlung genau ansehen",
      allowedFeedbackContext: "Erinnerbarkeit einer konkreten guten Handlung und ihrer erneut nutzbaren Qualität, ohne Selbstwert- oder Identitätsbewertung.",
      title: "Halte eine gute Handlung fest",
    },
    heading: "Tag 24 – jetzt trifft das Programm auf den echten Alltag",
    intro: [
      "Du bist jetzt mitten im Programm und kennst den Ablauf schon besser. Heute hast du eine konkrete gute Handlung und die Qualität dahinter betrachtet – jetzt interessiert uns, wie RewirePerform im echten Sportalltag bei dir ankommt.",
      "Sag uns ehrlich, was du inzwischen verstehst, was du mitnehmen kannst, was dir hilft und was noch nicht funktioniert. Deine Antworten helfen dir, kurz auf deinen eigenen Stand zu schauen – und uns, das Programm für dich und andere Athletinnen und Athleten besser zu machen.",
    ],
    durationLabel: "Etwa 5 Minuten", questions: day24Questions,
    closingTextPrompt: "Was sollten wir für den nächsten Abschnitt unbedingt wissen?",
    completionTitle: "Danke für deinen Zwischenstand.",
    completionBody: "Das ist deine aktuelle Einschätzung – keine Bewertung und kein Test.",
    summaryConstructIds: ["daily_fit", "training_transfer", "perceived_change_magnitude"],
  },
  39: {
    campaignReference: "feedback-day-39-v1",
    checkpointDay: 39, phase: 3, week: 6, language: "de", questionnaireVersion: "feedback-d39-v1.1.2",
    questionnaireManifestHash: "b566002d6f1d0c74f1eafb8554f370fa7f409f871473717079a478ad7b238b44",
    contentContext: {
      sourceContentCommit: FEEDBACK_PROGRAM_CONTENT_SOURCE_COMMIT,
      programDayContentHash: "d38bb4dfd45733719fa0007cc3d867c42874484ef78ca7318e52727617fe350c",
      toolId: "W5",
      tool: "Nicht automatisch folgen",
      cue: "Gedanken und Gefühle sind keine Befehle.",
      mechanism: "Der erste Gedanke nach einem Fehler ist oft ein Urteil, keine Korrektur.",
      missionTitle: "Gedanke erkennen, Information wählen",
      allowedFeedbackContext: "Trennung von Urteil und nutzbarer Fehlerinformation. Keine Aufforderung, Gedanken zu unterdrücken.",
      title: "Lass den ersten Satz nicht die Korrektur bestimmen",
    },
    heading: "Tag 39 – vom Verstehen zum Anwenden",
    intro: [
      "Du bist inzwischen weit im Programm. Heute ging es darum, nach einem Fehler den ersten inneren Satz von einer brauchbaren Information zu trennen – und insgesamt darum, ob du Inhalte in echten Situationen wiederfindest und nutzen kannst.",
      "Wir wollen wissen, was inzwischen erreichbar ist, was schon von selbst auftaucht und wo RewirePerform noch zu weit vom echten Sport entfernt ist. Positive Erfahrungen und klare Kritik sind gleichermaßen wichtig.",
    ],
    durationLabel: "Etwa 5 Minuten", questions: day39Questions,
    closingTextPrompt: "Was funktioniert für dich inzwischen wirklich – und was noch nicht?",
    completionTitle: "Danke für deine ehrliche Einschätzung.",
    completionBody: "Das ist dein aktueller Blick. Er kann sich im weiteren Verlauf verändern.",
    summaryConstructIds: ["training_transfer", "retrieval_access", "automaticity_stage", "perceived_change_magnitude"],
  },
  55: {
    campaignReference: "feedback-day-55-v1",
    checkpointDay: 55, phase: 4, week: 8, language: "de", questionnaireVersion: "feedback-d55-v1.1.2",
    questionnaireManifestHash: "b8b1eb9e97348090e2993ee634dc0616228f6c1138b450174d132f48b1029600",
    contentContext: {
      sourceContentCommit: FEEDBACK_PROGRAM_CONTENT_SOURCE_COMMIT,
      programDayContentHash: "0ef3aabda021d7885c1673f8d73ca9973452ca26279d85071b35dfb98e0b8d4e",
      toolId: "W2",
      tool: "Die Aufgabe zählt",
      cue: "Was braucht die Aufgabe?",
      mechanism: "Ein persönlicher Standard wird durch wiederholbares Verhalten klarer.",
      missionTitle: "Standard als Verhalten formulieren",
      allowedFeedbackContext: "Nach freiem Abruf: ob eigene konkrete Handlungen, ihre gemeinsame Qualität und eine beobachtbare Zukunftsformulierung gebildet werden konnten. Keine Wertung oder perfekte Veränderungsbehauptung.",
      title: "Zeig deinen Standard durch Handlungen",
      revealAfterQuestionId: "d55_free_recall_level",
    },
    heading: "Tag 55 – fast am Ende",
    intro: [
      "Du bist kurz vor dem Abschluss des Programms. Jetzt wollen wir zuerst wissen, was ohne Hinweise von selbst da ist. Schau dafür nicht noch einmal in frühere Tage oder Aufgaben.",
      "Danach geht es darum, was du wirklich nutzen konntest, was sich verändert hat, was nicht funktioniert hat und was RewirePerform unbedingt verbessern muss.",
    ],
    durationLabel: "Etwa 7 Minuten", questions: day55Questions,
    closingTextPrompt: "Was möchtest du uns nach fast 56 Tagen noch ehrlich sagen?",
    completionTitle: "Danke für deine ehrliche Sicht.",
    completionBody: "Deine Antworten helfen uns zu verstehen, was im echten Sportalltag funktioniert, wo es nicht funktioniert und was wir besser machen müssen.",
    summaryConstructIds: ["free_recall", "retrieval_access", "automaticity_stage", "perceived_change_magnitude", "helpful_components"],
  },
};

export const FEEDBACK_INTELLIGENCE_INVARIANTS = {
  checkpointDays: [10, 24, 39, 55] as const,
  identityPersonalization: false,
  deterministicCheckpointContext: true,
  structuredAnswerWithoutTextConsent: true,
  optionalCommentRequiresSeparateConsent: true,
  coachAccess: false,
  journalTextIncluded: false,
  journalUsageCountsAllowed: true,
  individualCoachObservationsIncluded: false,
  automaticAthleteDecisions: false,
  causalClaimsAllowed: false,
} as const;

export const getFeedbackCheckpoint = (day: FeedbackCheckpointDay): FeedbackCheckpointDefinition =>
  FEEDBACK_CHECKPOINTS[day];

export const getFeedbackQuestionnaireManifestPayload = (
  checkpoint: FeedbackCheckpointDefinition,
) => {
  const { questionnaireManifestHash: _questionnaireManifestHash, ...checkpointPayload } = checkpoint;
  return {
    schemaVersion: "feedback-questionnaire-manifest-v1" as const,
    contentVersion: FEEDBACK_INTELLIGENCE_CONTENT_VERSION,
    ...checkpointPayload,
  };
};

export const isFeedbackQuestionVisible = (
  question: FeedbackQuestionDefinition,
  answers: Readonly<Record<string, readonly string[]>>,
): boolean => {
  if (!question.visibleWhen) return true;
  const selected = answers[question.visibleWhen.questionId] ?? [];
  return selected.some((optionId) => question.visibleWhen?.selectedOptionIds.includes(optionId));
};
