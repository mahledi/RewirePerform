import {
  FEEDBACK_CHECKPOINTS,
  type FeedbackCheckpointDay,
  type FeedbackOption,
  type FeedbackQuestionDefinition,
} from "@/content/feedbackIntelligenceV1";

export const FEEDBACK_SEMANTICS_SCHEMA_VERSION =
  "rewire-feedback-construct-semantics-v0.3-producer-draft" as const;

export type FeedbackSemanticPolarity =
  | "SUPPORTIVE"
  | "CONCERN"
  | "NEUTRAL"
  | "NOT_APPLICABLE"
  | "DESCRIPTIVE";

export type FeedbackScaleAnalysisMode =
  | "ORDINAL_DIRECTIONAL"
  | "BIPOLAR_OPTIMUM"
  | "ORDINAL_MAGNITUDE"
  | "STAGE_DESCRIPTIVE"
  | "CATEGORICAL_DESCRIPTIVE";

interface ConstructMeta {
  humanLabelDe: string;
  dimension: string;
  measurementIntentionDe: string;
  productTestHypothesisDe: string;
}

interface ScaleMeta {
  humanLabelDe: string;
  ordered: boolean;
  analysisMode: FeedbackScaleAnalysisMode;
  interpretationRuleDe: string;
  polarities: Readonly<Record<string, FeedbackSemanticPolarity>>;
}

const five = (
  one: FeedbackSemanticPolarity,
  two: FeedbackSemanticPolarity,
  three: FeedbackSemanticPolarity,
  four: FeedbackSemanticPolarity,
  fiveValue: FeedbackSemanticPolarity,
): Readonly<Record<string, FeedbackSemanticPolarity>> => ({
  "1": one, "2": two, "3": three, "4": four, "5": fiveValue,
});

const positiveToConcern = five("SUPPORTIVE", "SUPPORTIVE", "NEUTRAL", "CONCERN", "CONCERN");
const concernToPositive = five("CONCERN", "CONCERN", "NEUTRAL", "SUPPORTIVE", "SUPPORTIVE");
const bipolarOptimum = five("CONCERN", "CONCERN", "SUPPORTIVE", "CONCERN", "CONCERN");
const descriptive = (...ids: string[]): Readonly<Record<string, FeedbackSemanticPolarity>> =>
  Object.fromEntries(ids.map((id) => [id, "DESCRIPTIVE" as const]));

const CONSTRUCT_META: Readonly<Record<string, ConstructMeta>> = {
  content_clarity: {
    humanLabelDe: "Inhaltsverständlichkeit", dimension: "understanding",
    measurementIntentionDe: "Erfasst die subjektive Verständlichkeit und Zielklarheit der täglichen Inhalte.",
    productTestHypothesisDe: "Eine konkretere Kernaussage gegen die bestehende Inhaltsfassung testen.",
  },
  task_clarity: {
    humanLabelDe: "Umsetzbarkeit der Aufgaben", dimension: "understanding",
    measurementIntentionDe: "Erfasst, wie klar und schnell die praktische Umsetzung einer Aufgabe verstanden wird.",
    productTestHypothesisDe: "Eine Aufgabe mit einem konkreteren ersten Handlungsschritt gegen die bestehende Fassung testen.",
  },
  text_load: {
    humanLabelDe: "Textmenge", dimension: "flow",
    measurementIntentionDe: "Erfasst, ob die tägliche Textmenge als passend, zu gering oder zu hoch erlebt wird.",
    productTestHypothesisDe: "Eine stärker portionierte Textfassung gegen die bestehende Fassung testen.",
  },
  daily_duration: {
    humanLabelDe: "Tägliche Dauer", dimension: "flow",
    measurementIntentionDe: "Erfasst, ob die Dauer eines täglichen Durchgangs als passend erlebt wird.",
    productTestHypothesisDe: "Einen kürzeren Tagesdurchgang gegen die bestehende Dauer testen.",
  },
  flow_clarity: {
    humanLabelDe: "Klarheit des Tagesablaufs", dimension: "flow",
    measurementIntentionDe: "Erfasst die subjektive Orientierung im Ablauf eines Programmtages.",
    productTestHypothesisDe: "Eine sichtbarere Schrittfolge gegen den bestehenden Tagesablauf testen.",
  },
  trial_ease: {
    humanLabelDe: "Leichtigkeit des Ausprobierens", dimension: "everyday_usability",
    measurementIntentionDe: "Erfasst, wie leicht Aufgaben im Alltag erstmals ausprobiert werden können.",
    productTestHypothesisDe: "Eine kleinere Einstiegsaufgabe gegen die bestehende Aufgabe testen.",
  },
  daily_fit: {
    humanLabelDe: "Passung in Sport und Alltag", dimension: "everyday_usability",
    measurementIntentionDe: "Erfasst die subjektive Vereinbarkeit mit Training, Wettkampf und Alltag.",
    productTestHypothesisDe: "Einen flexibleren Einstiegspunkt gegen die bestehende Tagesstruktur testen.",
  },
  program_affinity: {
    humanLabelDe: "Nutzungsgefühl", dimension: "experience",
    measurementIntentionDe: "Erfasst, wie gern das Programm in der jeweiligen Phase genutzt wird.",
    productTestHypothesisDe: "Den stärksten negativen Nutzungstreiber gezielt in einer Variante reduzieren.",
  },
  improvement_priority: {
    humanLabelDe: "Verbesserungspriorität", dimension: "product_quality",
    measurementIntentionDe: "Erfasst den Bereich, der aus Sicht der Person zuerst verbessert werden sollte.",
    productTestHypothesisDe: "Die meistgenannte Priorität als klar abgegrenzte Produktvariante testen.",
  },
  training_transfer: {
    humanLabelDe: "Bewusster Transfer in den Sport", dimension: "training_transfer",
    measurementIntentionDe: "Erfasst berichtete bewusste Anwendung von Inhalten im Training oder Sport.",
    productTestHypothesisDe: "Einen konkreteren Situationshinweis gegen den bisherigen Transferimpuls testen.",
  },
  self_learning: {
    humanLabelDe: "Selbstverständnis", dimension: "self_learning",
    measurementIntentionDe: "Erfasst die Selbsteinschätzung, eigene Reaktionen und Muster besser zu verstehen.",
    productTestHypothesisDe: "Eine präzisere Reflexionshilfe gegen die bestehende Formulierung testen.",
  },
  helpful_components: {
    humanLabelDe: "Hilfreiche Programmbestandteile", dimension: "product_quality",
    measurementIntentionDe: "Erfasst deskriptiv, welche sichtbaren Bestandteile als hilfreich erlebt werden.",
    productTestHypothesisDe: "Den am häufigsten genannten hilfreichen Bestandteil im nächsten Abschnitt sichtbarer verankern.",
  },
  perceived_change_magnitude: {
    humanLabelDe: "Wahrgenommene Veränderungsstärke", dimension: "perceived_change",
    measurementIntentionDe: "Erfasst die Stärke einer subjektiv wahrgenommenen Veränderung ohne deren Richtung zu bewerten.",
    productTestHypothesisDe: "Veränderungssignale nur gemeinsam mit Valenz und Aktivität weiter untersuchen.",
  },
  perceived_change_valence: {
    humanLabelDe: "Richtung der wahrgenommenen Veränderung", dimension: "perceived_change",
    measurementIntentionDe: "Erfasst, ob eine zuvor berichtete Veränderung als hilfreich, störend oder kontextabhängig erlebt wird.",
    productTestHypothesisDe: "Störende Veränderungsmuster zuerst qualitativ prüfen, bevor eine Produktvariante gebaut wird.",
  },
  low_energy_fit: {
    humanLabelDe: "Passung an Tagen mit wenig Energie", dimension: "everyday_usability",
    measurementIntentionDe: "Erfasst die subjektive Nutzbarkeit bei wenig Energie oder Motivation.",
    productTestHypothesisDe: "Einen reduzierten Low-Energy-Modus gegen den normalen Tagesablauf testen.",
  },
  retrieval_access: {
    humanLabelDe: "Subjektive Abrufbarkeit", dimension: "retrieval",
    measurementIntentionDe: "Erfasst, wie leicht ein passender Gedanke oder eine Handlung im Sport erinnert wird.",
    productTestHypothesisDe: "Einen einzelnen situationsgebundenen Abrufhinweis gegen die bestehende Wiederholung testen.",
  },
  automaticity_stage: {
    humanLabelDe: "Wahrgenommene Automatisierungsstufe", dimension: "perceived_automation",
    measurementIntentionDe: "Beschreibt, wie bewusst oder spontan die berichtete Nutzung beginnt; kein neurophysiologischer Nachweis.",
    productTestHypothesisDe: "Einen kurzen Situations-Cue gegen die bestehende Erinnerung testen.",
  },
  application_context: {
    humanLabelDe: "Anwendungskontext", dimension: "training_transfer",
    measurementIntentionDe: "Erfasst deskriptiv, in welchen Kontexten Inhalte oder Aufgaben berichtet genutzt wurden.",
    productTestHypothesisDe: "Für selten genannte Kontexte einen passenden Transferhinweis testen.",
  },
  standard_return: {
    humanLabelDe: "Bewusste Rückkehr zum Standard", dimension: "training_transfer",
    measurementIntentionDe: "Erfasst die berichtete Häufigkeit, nach einem Verlauf zur nächsten Aktion zurückzufinden.",
    productTestHypothesisDe: "Einen kürzeren Rückkehr-Cue gegen die bestehende Formulierung testen.",
  },
  main_barrier: {
    humanLabelDe: "Hauptbarriere", dimension: "product_quality",
    measurementIntentionDe: "Erfasst den aktuell stärksten berichteten Hinderungsgrund der Nutzung.",
    productTestHypothesisDe: "Die meistgenannte Barriere als ersten klar abgegrenzten UX-Test bearbeiten.",
  },
  free_recall: {
    humanLabelDe: "Freier Abruf am Programmende", dimension: "retention",
    measurementIntentionDe: "Erfasst eine ungeprimte Selbsteinschätzung zum freien Abruf; kein objektiver Gedächtnistest.",
    productTestHypothesisDe: "Eine zentrale Kernidee mit zeitversetztem Abruf gegen die bestehende Wiederholung testen.",
  },
  retention_gap: {
    humanLabelDe: "Berichtete Abruflücke", dimension: "retention",
    measurementIntentionDe: "Erfasst, wie häufig verstandene Inhalte später subjektiv nicht mehr abrufbar waren.",
    productTestHypothesisDe: "Eine zeitversetzte Wiederholung gegen die bisherige Wiederholungsfolge testen.",
  },
  overall_helpfulness: {
    humanLabelDe: "Gesamthilfreichkeit", dimension: "experience",
    measurementIntentionDe: "Erfasst die abschließende subjektive Hilfreichkeit für den Sportalltag.",
    productTestHypothesisDe: "Gesamthilfreichkeit nur zusammen mit konkreter Kritik, Transfer und Aktivität interpretieren.",
  },
  keep_priority: {
    humanLabelDe: "Erhaltenswerte Bestandteile", dimension: "product_quality",
    measurementIntentionDe: "Erfasst deskriptiv, welche Bestandteile unbedingt erhalten bleiben sollten.",
    productTestHypothesisDe: "Bei Änderungen die meistgenannten erhaltenswerten Bestandteile als Schutzkriterien verwenden.",
  },
};

const SCALE_META: Readonly<Record<string, ScaleMeta>> = {
  content_clarity_5_v1: {
    humanLabelDe: "Verständlichkeit von sehr klar bis sehr unklar", ordered: true,
    analysisMode: "ORDINAL_DIRECTIONAL",
    interpretationRuleDe: "Die Antwortposition läuft von hoher Verständlichkeit zu geringer Verständlichkeit; Varianten nutzen bewusst unterschiedliche sichtbare Wörter.",
    polarities: positiveToConcern,
  },
  task_actionability_5_v1: {
    humanLabelDe: "Praktische Aufgabenklarheit", ordered: true, analysisMode: "ORDINAL_DIRECTIONAL",
    interpretationRuleDe: "Die Skala bündelt Klarheit und Geschwindigkeit des praktischen Verstehens; nur die gemeinsame Richtung darf längsschnittlich verglichen werden.",
    polarities: positiveToConcern,
  },
  amount_bipolar_5_v1: {
    humanLabelDe: "Bipolare Textmengenpassung", ordered: true, analysisMode: "BIPOLAR_OPTIMUM",
    interpretationRuleDe: "Die Mitte ist die passende Menge; beide Außenrichtungen sind unterschiedliche Kritik und dürfen nicht zu einem linearen Mittelwert verdichtet werden.",
    polarities: bipolarOptimum,
  },
  duration_bipolar_5_v1: {
    humanLabelDe: "Bipolare Dauerpassung", ordered: true, analysisMode: "BIPOLAR_OPTIMUM",
    interpretationRuleDe: "Die Mitte ist die passende Dauer; zu kurz und zu lang bleiben getrennte Kritikrichtungen.",
    polarities: bipolarOptimum,
  },
  ease_5_v1: {
    humanLabelDe: "Leichtigkeit", ordered: true, analysisMode: "ORDINAL_DIRECTIONAL",
    interpretationRuleDe: "Die Antwortposition läuft von leicht zu schwer.", polarities: positiveToConcern,
  },
  ease_5_not_tried_v1: {
    humanLabelDe: "Leichtigkeit mit Nicht-ausprobiert-Option", ordered: true, analysisMode: "ORDINAL_DIRECTIONAL",
    interpretationRuleDe: "Die fünf Stufen laufen von leicht zu schwer; nicht ausprobiert wird nie bewertet.",
    polarities: { ...positiveToConcern, not_tried: "NOT_APPLICABLE" },
  },
  fit_5_v1: {
    humanLabelDe: "Passung", ordered: true, analysisMode: "ORDINAL_DIRECTIONAL",
    interpretationRuleDe: "Die Antwortposition läuft von guter zu schlechter Passung.", polarities: positiveToConcern,
  },
  fit_5_not_experienced_v1: {
    humanLabelDe: "Passung mit Nicht-erlebt-Option", ordered: true, analysisMode: "ORDINAL_DIRECTIONAL",
    interpretationRuleDe: "Die fünf Stufen laufen von guter zu schlechter Passung; noch nicht erlebt wird nie bewertet.",
    polarities: { ...positiveToConcern, not_experienced: "NOT_APPLICABLE" },
  },
  affinity_5_v1: {
    humanLabelDe: "Nutzungsneigung", ordered: true, analysisMode: "ORDINAL_DIRECTIONAL",
    interpretationRuleDe: "Die Antwortposition läuft von gerne zu ungern.", polarities: positiveToConcern,
  },
  training_transfer_frequency_5_v1: {
    humanLabelDe: "Berichtete Transferhäufigkeit", ordered: true, analysisMode: "ORDINAL_DIRECTIONAL",
    interpretationRuleDe: "Die fünf Stufen laufen von nie zu sehr oft; fehlende Gelegenheit wird nie bewertet und ist an Tag 55 nicht angeboten.",
    polarities: { ...concernToPositive, no_opportunity: "NOT_APPLICABLE" },
  },
  magnitude_5_v1: {
    humanLabelDe: "Stärke des berichteten Selbstlernens", ordered: true, analysisMode: "ORDINAL_DIRECTIONAL",
    interpretationRuleDe: "Die Antwortposition läuft von keiner zu sehr deutlicher berichteter Selbsterkenntnis.", polarities: concernToPositive,
  },
  perceived_change_magnitude_5_v1: {
    humanLabelDe: "Stärke einer berichteten Veränderung", ordered: true, analysisMode: "ORDINAL_MAGNITUDE",
    interpretationRuleDe: "Die Skala beschreibt nur Stärke. Sie ist ohne die separate Valenzfrage weder positiv noch negativ und kein Wirkungsnachweis.",
    polarities: five("NEUTRAL", "NEUTRAL", "NEUTRAL", "NEUTRAL", "NEUTRAL"),
  },
  change_valence_6_v1: {
    humanLabelDe: "Valenz einer berichteten Veränderung", ordered: false, analysisMode: "CATEGORICAL_DESCRIPTIVE",
    interpretationRuleDe: "Hilfreiche, störende, neutrale und kontextabhängige Antworten bleiben getrennt.",
    polarities: {
      strongly_helpful: "SUPPORTIVE", rather_helpful: "SUPPORTIVE", neutral: "NEUTRAL",
      rather_disruptive: "CONCERN", strongly_disruptive: "CONCERN", depends: "NEUTRAL",
    },
  },
  components_d24_multi_v1: {
    humanLabelDe: "Hilfreiche Bestandteile an Tag 24", ordered: false, analysisMode: "CATEGORICAL_DESCRIPTIVE",
    interpretationRuleDe: "Mehrfachauswahl wird als Anteil je Bestandteil beschrieben; die Optionen werden nicht addiert oder gerankt.",
    polarities: { "1": "SUPPORTIVE", "2": "SUPPORTIVE", "3": "SUPPORTIVE", "4": "SUPPORTIVE", "5": "SUPPORTIVE", "6": "CONCERN", "7": "DESCRIPTIVE" },
  },
  components_d55_multi_v1: {
    humanLabelDe: "Hilfreiche Bestandteile an Tag 55", ordered: false, analysisMode: "CATEGORICAL_DESCRIPTIVE",
    interpretationRuleDe: "Mehrfachauswahl wird als Anteil je Bestandteil beschrieben; sie ist wegen anderer Optionen nicht direkt mit Tag 24 gleichzusetzen.",
    polarities: { "1": "SUPPORTIVE", "2": "SUPPORTIVE", "3": "SUPPORTIVE", "4": "SUPPORTIVE", "5": "SUPPORTIVE", "6": "SUPPORTIVE", "7": "CONCERN", "8": "DESCRIPTIVE" },
  },
  improvement_area_d10_v1: {
    humanLabelDe: "Verbesserungsbereich an Tag 10", ordered: false, analysisMode: "CATEGORICAL_DESCRIPTIVE",
    interpretationRuleDe: "Jede Option ist eine eigenständige Produktpriorität und keine Rangstufe.", polarities: descriptive("1", "2", "3", "4", "5", "6", "7", "8"),
  },
  improvement_area_d24_v1: {
    humanLabelDe: "Verbesserungsbereich an Tag 24", ordered: false, analysisMode: "CATEGORICAL_DESCRIPTIVE",
    interpretationRuleDe: "Jede Option ist eine eigenständige Produktpriorität und nicht direkt mit anders formulierten Checkpoints gleichzusetzen.", polarities: descriptive("1", "2", "3", "4", "5", "6", "7"),
  },
  automaticity_stage_5_v1: {
    humanLabelDe: "Wahrgenommene Nutzungsstufe", ordered: false, analysisMode: "STAGE_DESCRIPTIVE",
    interpretationRuleDe: "Die Kategorien beschreiben verschiedene Startpunkte der Nutzung; sie beweisen keine Automatisierung oder Gehirnveränderung.",
    polarities: { "1": "DESCRIPTIVE", "2": "DESCRIPTIVE", "3": "SUPPORTIVE", "4": "SUPPORTIVE", "5": "CONCERN" },
  },
  application_context_multi_v1: {
    humanLabelDe: "Berichtete Anwendungskontexte", ordered: false, analysisMode: "CATEGORICAL_DESCRIPTIVE",
    interpretationRuleDe: "Kontexte werden einzeln als Mehrfachauswahl beschrieben; sie werden nicht als Qualitätswert addiert.",
    polarities: { "1": "SUPPORTIVE", "2": "SUPPORTIVE", "3": "SUPPORTIVE", "4": "SUPPORTIVE", "5": "CONCERN" },
  },
  frequency_5_no_opportunity_v1: {
    humanLabelDe: "Häufigkeit mit fehlender Gelegenheit", ordered: true, analysisMode: "ORDINAL_DIRECTIONAL",
    interpretationRuleDe: "Die fünf Stufen laufen von nie zu sehr oft; fehlende Gelegenheit wird nie bewertet.",
    polarities: { ...concernToPositive, no_opportunity: "NOT_APPLICABLE" },
  },
  barrier_d39_v1: {
    humanLabelDe: "Hauptbarriere an Tag 39", ordered: false, analysisMode: "CATEGORICAL_DESCRIPTIVE",
    interpretationRuleDe: "Barrieren werden einzeln beschrieben und nicht gerankt.",
    polarities: { "1": "CONCERN", "2": "CONCERN", "3": "CONCERN", "4": "CONCERN", "5": "CONCERN", "6": "CONCERN", "7": "CONCERN", "8": "SUPPORTIVE", "9": "DESCRIPTIVE" },
  },
  free_recall_stage_5_v1: {
    humanLabelDe: "Stufe des freien Abrufs", ordered: true, analysisMode: "STAGE_DESCRIPTIVE",
    interpretationRuleDe: "Die Kategorien beschreiben berichteten freien Abruf ohne Inhaltspriming; sie sind kein validierter Gedächtnisscore.",
    polarities: five("CONCERN", "DESCRIPTIVE", "SUPPORTIVE", "SUPPORTIVE", "SUPPORTIVE"),
  },
  retention_gap_frequency_5_v1: {
    humanLabelDe: "Häufigkeit berichteter Abruflücken", ordered: true, analysisMode: "ORDINAL_DIRECTIONAL",
    interpretationRuleDe: "Die Antwortposition läuft von nie zu sehr oft; höhere Häufigkeit bedeutet mehr berichtete Abruflücken.",
    polarities: positiveToConcern,
  },
  helpfulness_5_v1: {
    humanLabelDe: "Subjektive Gesamthilfreichkeit", ordered: true, analysisMode: "ORDINAL_DIRECTIONAL",
    interpretationRuleDe: "Die Antwortposition läuft von sehr hilfreich zu gar nicht hilfreich; sie ist kein kausaler Wirkungsnachweis.", polarities: positiveToConcern,
  },
  keep_area_d55_multi_v1: {
    humanLabelDe: "Erhaltenswerte Bestandteile an Tag 55", ordered: false, analysisMode: "CATEGORICAL_DESCRIPTIVE",
    interpretationRuleDe: "Mehrfachauswahl wird deskriptiv je Bestandteil ausgewertet und nicht gerankt.", polarities: descriptive("1", "2", "3", "4", "5", "6", "7", "8"),
  },
  improvement_area_d55_v1: {
    humanLabelDe: "Verbesserungsbereich an Tag 55", ordered: false, analysisMode: "CATEGORICAL_DESCRIPTIVE",
    interpretationRuleDe: "Jede Option ist eine eigenständige Produktpriorität und nicht direkt mit früheren Auswahlsets gleichzusetzen.", polarities: descriptive("1", "2", "3", "4", "5", "6", "7", "8", "9"),
  },
};

const PHASE_BY_DAY: Readonly<Record<FeedbackCheckpointDay, string>> = {
  10: "ORIENTATION", 24: "APPLICATION", 39: "CONSOLIDATION", 55: "TRANSFER",
};

const checkpointIntention = (day: FeedbackCheckpointDay): string => ({
  10: "Frühes Verständnis, Nutzungsgefühl und Einstiegshürden erfassen.",
  24: "Erste Alltagseinbindung, bewussten Transfer und wahrgenommene Entwicklung erfassen.",
  39: "Abruf, Anwendung, wahrgenommene Automatisierung und Barrieren in der Festigungsphase erfassen.",
  55: "Freien Abruf, langfristige Nutzbarkeit, Transfer und abschließende Produktkritik erfassen.",
})[day];

const evidenceId = (questionId: string): string =>
  `FICAT-DE-V0.3-${questionId.toUpperCase().replaceAll("_", "-")}`;

const neutralSemantic = (labels: readonly string[]): string =>
  labels.length === 1
    ? `Die Person wählt die Antwort „${labels[0]}“.`
    : `Die Person wählt je nach Checkpoint eine gleich codierte Antwortvariante: ${labels.map((label) => `„${label}“`).join(", ")}.`;

const displayOptions = (options: readonly FeedbackOption[]) => options.map((option) => ({
  answer_id: option.id,
  human_label_de: option.label,
  not_scored: option.notScored ?? false,
  exclusive: option.exclusive ?? false,
}));

const questions = Object.values(FEEDBACK_CHECKPOINTS).flatMap((checkpoint) =>
  checkpoint.questions.map((question) => ({ checkpoint, question })),
);

const buildFamily = (
  constructId: string,
  itemFamilyId: string,
  familyRows: readonly { checkpoint: (typeof FEEDBACK_CHECKPOINTS)[FeedbackCheckpointDay]; question: FeedbackQuestionDefinition }[],
) => {
  const scaleIds = [...new Set(familyRows.map(({ question }) => question.scaleId))];
  if (scaleIds.length !== 1) throw new Error(`feedback_semantics_scale_drift:${itemFamilyId}`);
  const scaleId = scaleIds[0];
  const scale = SCALE_META[scaleId];
  if (!scale) throw new Error(`feedback_semantics_scale_missing:${scaleId}`);

  const answerIds = [...new Set(familyRows.flatMap(({ question }) => question.options.map(({ id }) => id)))];
  const answerOptions = answerIds.map((answerId) => {
    const labels = [...new Set(familyRows.flatMap(({ question }) =>
      question.options.filter(({ id }) => id === answerId).map(({ label }) => label),
    ))];
    const polarity = scale.polarities[answerId];
    if (!polarity) throw new Error(`feedback_semantics_answer_missing:${scaleId}:${answerId}`);
    return {
      answer_id: answerId,
      observed_labels_de: labels,
      neutral_semantic_de: neutralSemantic(labels),
      polarity,
    };
  });

  const meta = CONSTRUCT_META[constructId];
  return {
    item_family_id: itemFamilyId,
    human_label_de: meta.humanLabelDe,
    longitudinal_comparison: familyRows.length > 1,
    scale: {
      scale_id: scaleId,
      human_label_de: scale.humanLabelDe,
      ordered: scale.ordered,
      analysis_mode: scale.analysisMode,
      interpretation_rule_de: scale.interpretationRuleDe,
      answer_options: answerOptions,
    },
    questions: familyRows.map(({ checkpoint, question }) => ({
      question_id: question.id,
      human_label_de: question.prompt,
      item_variant_id: question.itemVariantId,
      analysis_role: question.analysisRole,
      display_answer_options: displayOptions(question.options),
      checkpoint: {
        program_day: checkpoint.checkpointDay,
        program_phase: PHASE_BY_DAY[checkpoint.checkpointDay],
        measurement_intention_de: checkpointIntention(checkpoint.checkpointDay),
      },
      stable_evidence_id: evidenceId(question.id),
    })),
    product_test_hypothesis_de: meta.productTestHypothesisDe,
  };
};

const constructIds = [...new Set(questions.map(({ question }) => question.constructId))];

export const FEEDBACK_CONSTRUCT_CATALOG_V03 = {
  schema_version: FEEDBACK_SEMANTICS_SCHEMA_VERSION,
  contract_status: "PRODUCER_CONFIRMED_DRAFT_NOT_ACTIVATED",
  source_questionnaire_content_version: "feedback-intelligence-content-v1.0.0",
  catalog_scope: {
    language: "de-DE",
    jurisdiction: "DE",
    data_class: "SEMANTICS_ONLY_NO_USER_FEEDBACK_OR_ACTIVITY_DATA",
    stable_evidence_namespace: "FICAT-DE-V0.3",
  },
  evidence_boundaries: {
    observational_not_causal: true,
    self_report_not_objective_performance: true,
    automaticity_not_neurophysiological_proof: true,
    categorical_options_not_scores: true,
    minimum_cohort_size_floor: 5,
    low_confidence_cohort_max: 9,
  },
  constructs: constructIds.map((constructId) => {
    const meta = CONSTRUCT_META[constructId];
    if (!meta) throw new Error(`feedback_semantics_construct_missing:${constructId}`);
    const rows = questions.filter(({ question }) => question.constructId === constructId);
    const familyIds = [...new Set(rows.map(({ question }) => question.itemFamilyId))];
    return {
      construct_id: constructId,
      human_label_de: meta.humanLabelDe,
      dimension: meta.dimension,
      measurement_intention_de: meta.measurementIntentionDe,
      item_families: familyIds.map((itemFamilyId) => buildFamily(
        constructId,
        itemFamilyId,
        rows.filter(({ question }) => question.itemFamilyId === itemFamilyId),
      )),
    };
  }),
} as const;
