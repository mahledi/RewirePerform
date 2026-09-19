export const FEEDBACK_TEXT_CONSENT_SCOPE_V12 =
  "product-improvement-internal-admin-review-v1" as const;
export const FEEDBACK_TEXT_CONSENT_VERSION_V12 = "feedback-text-consent-v1.2.0" as const;
export const FEEDBACK_TEXT_NOTICE_HASH_V12 =
  "b5f1ef6bb515ad4eebfc4282d31149fd7a69f3e667ec62fb1788ee6419a145fe" as const;

export const feedbackTextConsentCopyV12 = {
  title: "Mach RewirePerform mit deinem Feedback besser",
  body: [
    "Ein kurzer freiwilliger Kommentar zeigt uns genauer, was für dich klar ist, was dir hilft und was wir verbessern sollten.",
    "Du kannst alle Auswahlfragen beantworten und senden, ohne einen Kommentar freizugeben. Wenn du zustimmst, darf RewirePerform nur deinen bewusst eingegebenen Produktfeedback-Kommentar gemeinsam mit deinen strukturierten Feedbackantworten und minimierten Aktivitätszahlen intern prüfen.",
    "Der Kommentar erscheint ausschließlich in einer geschützten, pseudonymisierten und nur lesenden Admin-Ansicht. Jarvis und externe KI-Anbieter erhalten ihn nicht.",
    "Dein Coach sieht ihn nicht. Wir nutzen ihn nicht für Werbung, Personalisierung oder automatische Entscheidungen über dich. Ein Nein verändert weder dein Programm noch deine Auswahlantworten. Du kannst deine Einwilligung jederzeit in den Einstellungen widerrufen.",
  ],
  acceptLabel: "Ja, Kommentar freiwillig freigeben",
  declineLabel: "Ohne Kommentar fortfahren",
} as const;

export const feedbackTextConsentCanonicalDocumentV12 = {
  jurisdiction: "DE",
  scope: FEEDBACK_TEXT_CONSENT_SCOPE_V12,
  consentVersion: FEEDBACK_TEXT_CONSENT_VERSION_V12,
  processorMode: "no_external_processor",
  copy: feedbackTextConsentCopyV12,
} as const;
