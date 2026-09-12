export const FEEDBACK_TEXT_CONSENT_SCOPE_V11 =
  "product-improvement-individual-text-ai-analysis-v1" as const;
export const FEEDBACK_TEXT_CONSENT_VERSION_V11 = "feedback-text-consent-v1.1.0" as const;
export const FEEDBACK_TEXT_NOTICE_HASH_V11 =
  "c308e8ad3d89b02c308a07090a4c09cb363f9cdb7d1e5d671ac295c545d95a16" as const;

export const feedbackTextConsentCopyV11 = {
  title: "Mach RewirePerform mit deinem Feedback besser",
  body: [
    "Ein kurzer freiwilliger Kommentar zeigt uns genauer, was für dich klar ist, was dir hilft und was wir verbessern sollten.",
    "Du kannst alle Auswahlfragen beantworten und senden, ohne einen Kommentar freizugeben. Wenn du zustimmst, darf RewirePerform nur deinen bewusst eingegebenen Produktfeedback-Kommentar gemeinsam mit deinen strukturierten Feedbackantworten und minimierten Aktivitätszahlen auswerten.",
    "Im Analyseexport stehen weder dein Name noch deine E-Mail-Adresse. Die Auswertung läuft im intern betriebenen Jarvis-System; kein externer KI-Anbieter erhält deinen Kommentar.",
    "Dein Coach sieht ihn nicht. Wir nutzen ihn nicht für Werbung, Personalisierung oder automatische Entscheidungen über dich. Ein Nein verändert weder dein Programm noch deine Auswahlantworten. Du kannst deine Einwilligung jederzeit in den Einstellungen widerrufen.",
  ],
  acceptLabel: "Ja, Kommentar freiwillig freigeben",
  declineLabel: "Ohne Kommentar fortfahren",
} as const;

export const feedbackTextConsentCanonicalDocumentV11 = {
  jurisdiction: "DE",
  scope: FEEDBACK_TEXT_CONSENT_SCOPE_V11,
  consentVersion: FEEDBACK_TEXT_CONSENT_VERSION_V11,
  processorMode: "no_external_processor",
  copy: feedbackTextConsentCopyV11,
} as const;
