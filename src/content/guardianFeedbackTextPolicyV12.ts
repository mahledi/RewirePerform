import {
  FEEDBACK_TEXT_CONSENT_SCOPE_V12,
  FEEDBACK_TEXT_CONSENT_VERSION_V12,
} from "./feedbackTextConsentV12.ts";

export const GUARDIAN_FEEDBACK_TEXT_POLICY_REFERENCE_V12 =
  "guardian-feedback-text-de-v1.2.0" as const;
export const GUARDIAN_FEEDBACK_TEXT_SCOPE_V12 = FEEDBACK_TEXT_CONSENT_SCOPE_V12;
export const GUARDIAN_FEEDBACK_TEXT_CONSENT_VERSION_V12 = FEEDBACK_TEXT_CONSENT_VERSION_V12;
export const GUARDIAN_FEEDBACK_TEXT_NOTICE_HASH_V12 =
  "f24a97f28ddda04507812b7db46e629885e1796c8810ea85901d9c2b06fa9846" as const;
export const GUARDIAN_FEEDBACK_TEXT_RETENTION_DAYS_V12 = 365 as const;

export const guardianFeedbackTextPolicyCopyV12 = {
  label: "Mit Feedback RewirePerform verbessern",
  detail: "An vier Stellen kann die minderjährige Person freiwillig einen kurzen Produktfeedback-Kommentar ergänzen. Die strukturierten Auswahlfragen funktionieren vollständig ohne Kommentar. Nur bewusst freigegebene Kommentare dürfen intern zusammen mit den zugehörigen strukturierten Feedbackantworten und minimierten Aktivitätszahlen geprüft werden. Journale und private Reflexionen bleiben ausgeschlossen.",
  privateContentClarification: "Die einzige Ausnahme sind klar als Produktfeedback gekennzeichnete Kommentare – und nur mit dieser getrennten Freigabe plus der freiwilligen Entscheidung der minderjährigen Person am jeweiligen Feedback-Checkpoint.",
  purpose: "Die Rückmeldungen helfen uns ausschließlich dabei, RewirePerform für Athletinnen und Athleten verständlicher, hilfreicher und nutzerfreundlicher zu machen.",
  athleteChoice: "Diese Elternfreigabe öffnet nur die freiwillige Möglichkeit. Die minderjährige Person entscheidet an jedem Feedback-Checkpoint zusätzlich selbst, ob sie einen Kommentar freigibt. Ohne Kommentar bleiben alle strukturierten Feedbackfragen nutzbar.",
  includedData: "Geprüft werden nur bewusst abgegebene Produktfeedback-Kommentare, die zugehörigen strukturierten Antworten sowie minimierte Aktivitätszahlen wie abgeschlossene Programmtage, Check-ins, erledigte Aufgaben und die reine Anzahl erstellter Journale.",
  excludedData: "Journalinhalte, private Reflexionen, Namen, E-Mail-Adressen, Team- und Coach-Daten sowie andere nicht ausdrücklich als Produktfeedback abgefragte Freitexte gehören nicht in diese Prüfung.",
  prohibitedUses: "Die Daten werden nicht für Werbung, Personalisierung, Coach-Bewertungen oder automatisierte Entscheidungen über Athletinnen und Athleten verwendet.",
  processor: "Der Kommentar erscheint ausschließlich in einer geschützten, pseudonymisierten und nur lesenden Admin-Ansicht. Jarvis und externe KI-Anbieter erhalten keine Produktfeedback-Kommentare.",
  retention: "Kommentare und personenbeziehbare Ableitungen werden höchstens 365 Tage gespeichert und vorher gelöscht, wenn die Freigabe widerrufen, das Konto gelöscht oder der konkrete Produktverbesserungszweck beendet wird.",
  withdrawal: "Die Freigabe kann über den persönlichen Verwaltungslink oder den Datenschutzkontakt widerrufen werden. Der Widerruf löscht Kommentare und personenbeziehbare Ableitungen; strukturierte Antworten bleiben für geschützte Gruppenauswertungen erhalten.",
  voluntary: "Die Entscheidung ist freiwillig. Ein Nein oder Widerruf hat keinen Einfluss auf Programm, Aufgaben, sportliche Teilnahme oder strukturierte Feedbackfragen.",
} as const;

export const guardianFeedbackTextCanonicalDocumentV12 = {
  policyReference: GUARDIAN_FEEDBACK_TEXT_POLICY_REFERENCE_V12,
  jurisdiction: "DE",
  scope: GUARDIAN_FEEDBACK_TEXT_SCOPE_V12,
  consentVersion: GUARDIAN_FEEDBACK_TEXT_CONSENT_VERSION_V12,
  retentionDays: GUARDIAN_FEEDBACK_TEXT_RETENTION_DAYS_V12,
  processorMode: "no_external_processor",
  copy: guardianFeedbackTextPolicyCopyV12,
} as const;
