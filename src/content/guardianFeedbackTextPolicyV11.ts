import {
  FEEDBACK_TEXT_CONSENT_SCOPE_V11,
  FEEDBACK_TEXT_CONSENT_VERSION_V11,
} from "./feedbackTextConsentV11.ts";

export const GUARDIAN_FEEDBACK_TEXT_POLICY_REFERENCE_V11 =
  "guardian-feedback-text-de-v1.1.0" as const;
export const GUARDIAN_FEEDBACK_TEXT_SCOPE_V11 = FEEDBACK_TEXT_CONSENT_SCOPE_V11;
export const GUARDIAN_FEEDBACK_TEXT_CONSENT_VERSION_V11 = FEEDBACK_TEXT_CONSENT_VERSION_V11;
export const GUARDIAN_FEEDBACK_TEXT_NOTICE_HASH_V11 =
  "90b0ede2a1a7671f1631e2048a605e6331006972ee05e63d38d229857f0aeb0b" as const;
export const GUARDIAN_FEEDBACK_TEXT_RETENTION_DAYS_V11 = 365 as const;

export const guardianFeedbackTextPolicyCopyV11 = {
  label: "Mit Feedback RewirePerform verbessern",
  detail:
    "An vier Stellen kann die minderjährige Person freiwillig einen kurzen Produktfeedback-Kommentar ergänzen. Die strukturierten Auswahlfragen funktionieren vollständig ohne Kommentar. Nur bewusst freigegebene Kommentare dürfen einzeln mit den zugehörigen strukturierten Feedbackantworten und minimierten Aktivitätszahlen ausgewertet werden. Journale und private Reflexionen bleiben ausgeschlossen.",
  privateContentClarification:
    "Die einzige Ausnahme sind klar als Produktfeedback gekennzeichnete Kommentare – und nur mit dieser getrennten Freigabe plus der freiwilligen Entscheidung der minderjährigen Person am jeweiligen Feedback-Checkpoint.",
  purpose:
    "Die Rückmeldungen helfen uns ausschließlich dabei, RewirePerform für Athletinnen und Athleten verständlicher, hilfreicher und nutzerfreundlicher zu machen.",
  athleteChoice:
    "Diese Elternfreigabe öffnet nur die freiwillige Möglichkeit. Die minderjährige Person entscheidet an jedem Feedback-Checkpoint zusätzlich selbst, ob sie einen Kommentar freigibt. Ohne Kommentar bleiben alle strukturierten Feedbackfragen nutzbar.",
  includedData:
    "Ausgewertet werden nur bewusst abgegebene Produktfeedback-Kommentare, die zugehörigen strukturierten Antworten sowie minimierte Aktivitätszahlen wie abgeschlossene Programmtage, Check-ins, erledigte Aufgaben und die reine Anzahl erstellter Journale.",
  excludedData:
    "Journalinhalte, private Reflexionen, Namen, E-Mail-Adressen, Team- und Coach-Daten sowie andere nicht ausdrücklich als Produktfeedback abgefragte Freitexte gehören nicht in diese Auswertung.",
  prohibitedUses:
    "Die Daten werden nicht für Werbung, Personalisierung, Coach-Bewertungen oder automatisierte Entscheidungen über Athletinnen und Athleten verwendet.",
  processor:
    "Die Analyse erfolgt über das intern und lokal betriebene Jarvis-System. Im Analyseexport stehen weder Name noch E-Mail-Adresse. Kein externer KI-Anbieter erhält echte Produktfeedback-Kommentare. Eine spätere externe Übermittlung erfordert eine neue, konkrete Information und eine neue Prüfung der Freigabe.",
  retention:
    "Kommentare und personenbeziehbare Analyseableitungen werden höchstens 365 Tage gespeichert und vorher gelöscht, wenn die Freigabe widerrufen, das Konto gelöscht oder der konkrete Produktverbesserungszweck beendet wird.",
  withdrawal:
    "Die Freigabe kann über den persönlichen Verwaltungslink oder den Datenschutzkontakt widerrufen werden. Der Widerruf löscht Kommentare und personenbeziehbare Ableitungen; strukturierte Antworten bleiben für geschützte Gruppenauswertungen erhalten.",
  voluntary:
    "Die Entscheidung ist freiwillig. Ein Nein oder Widerruf hat keinen Einfluss auf Programm, Aufgaben, sportliche Teilnahme oder strukturierte Feedbackfragen.",
} as const;

export const guardianFeedbackTextCanonicalDocumentV11 = {
  policyReference: GUARDIAN_FEEDBACK_TEXT_POLICY_REFERENCE_V11,
  jurisdiction: "DE",
  scope: GUARDIAN_FEEDBACK_TEXT_SCOPE_V11,
  consentVersion: GUARDIAN_FEEDBACK_TEXT_CONSENT_VERSION_V11,
  retentionDays: GUARDIAN_FEEDBACK_TEXT_RETENTION_DAYS_V11,
  processorMode: "no_external_processor",
  copy: guardianFeedbackTextPolicyCopyV11,
} as const;
