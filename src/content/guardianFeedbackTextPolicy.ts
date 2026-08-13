export const GUARDIAN_FEEDBACK_TEXT_POLICY_REFERENCE = "guardian-feedback-text-de-v1.1.0-draft";
export const GUARDIAN_FEEDBACK_TEXT_SCOPE = "product-improvement-individual-text-ai-analysis-v1";
export const GUARDIAN_FEEDBACK_TEXT_CONSENT_VERSION = "feedback-text-consent-v1.1.0-draft";
export const GUARDIAN_FEEDBACK_TEXT_NOTICE_HASH = "4b7c6f6cbf3d932c2e244d6a281f0d45056706eeb6108cb2ac2303dbe0f19c4f";
export const GUARDIAN_FEEDBACK_TEXT_RETENTION_DAYS = 365;

export const guardianFeedbackTextPolicyCopy = {
  label: "Mit Feedback RewirePerform verbessern",
  detail:
    "An vier Stellen kann die minderjährige Person mit einem kurzen Produktfeedback-Kommentar genauer zeigen, was klar ist, was hilft und was RewirePerform verbessern sollte. Nur diese bewusst abgegebenen Kommentare dürfen einzeln mit den freigegebenen strukturierten Feedback- und Aktivitätsdaten ausgewertet werden. Journale und private Reflexionen bleiben ausgeschlossen.",
  privateContentClarification:
    "Die einzige Ausnahme sind klar als Produktfeedback gekennzeichnete Kommentare – und nur mit dieser getrennten Freigabe plus der freiwilligen Entscheidung der minderjährigen Person am jeweiligen Feedback-Checkpoint.",
  purpose:
    "Die Rückmeldungen helfen uns ausschließlich dabei, RewirePerform für Athletinnen und Athleten verständlicher, hilfreicher und nutzerfreundlicher zu machen.",
  athleteChoice:
    "Diese Elternfreigabe öffnet nur die Möglichkeit. Die minderjährige Person entscheidet an jedem Feedback-Checkpoint zusätzlich selbst, ob sie ein Kommentarfeld öffnen und einen Kommentar abgeben möchte.",
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

export const guardianFeedbackTextCanonicalDocument = {
  policyReference: GUARDIAN_FEEDBACK_TEXT_POLICY_REFERENCE,
  jurisdiction: "DE",
  scope: GUARDIAN_FEEDBACK_TEXT_SCOPE,
  consentVersion: GUARDIAN_FEEDBACK_TEXT_CONSENT_VERSION,
  retentionDays: GUARDIAN_FEEDBACK_TEXT_RETENTION_DAYS,
  processorMode: "no_external_processor",
  copy: guardianFeedbackTextPolicyCopy,
} as const;
