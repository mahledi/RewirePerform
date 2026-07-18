export type MinorGuardianAgeBand = "under_16" | "age_16_17" | "adult";

export type MinorGuardianPreviewState =
  | "age-check"
  | "guardian-contact"
  | "guardian-pending"
  | "guardian-email"
  | "guardian-review"
  | "guardian-complete"
  | "athlete-assent"
  | "authorized"
  | "guardian-declined"
  | "athlete-declined"
  | "revoked"
  | "expired"
  | "age-16-17-decision"
  | "adult-ready"
  | "settings";

export const MINOR_GUARDIAN_DRAFT = {
  status: "implementation_complete_legal_review_required",
  jurisdiction: "DE",
  createdAt: "2026-07-18",
  policyVersion: "minor_product_v1_2026_07",
  guardianNoticeVersion: "guardian_notice_v1_2026_07",
  guardianAuthorizationVersion: "guardian_decision_v1_2026_07",
  athleteAssentVersion: "athlete_assent_v1_2026_07",
  evaluationConsentVersion: "data_contribution_v2_2026_07",
  researchEnabled: false,
  marketingEmailEnabled: false,
  productTrackingEnabledAfterAuthorization: true,
  enforcementDefaultEnabled: false,
} as const;

export const minorGuardianAgeBands: ReadonlyArray<{
  id: MinorGuardianAgeBand;
  label: string;
  detail: string;
}> = [
  {
    id: "under_16",
    label: "Unter 16",
    detail: "Eine sorgeberechtigte Person muss zuerst informiert werden und zustimmen.",
  },
  {
    id: "age_16_17",
    label: "16 bis 17",
    detail: "Du erhältst eine eigene verständliche Entscheidung ohne Kontakt zu einer sorgeberechtigten Person.",
  },
  {
    id: "adult",
    label: "18 oder älter",
    detail: "Du kannst deine Entscheidungen selbst treffen.",
  },
] as const;

export const minorGuardianPreviewStates: ReadonlyArray<{
  id: MinorGuardianPreviewState;
  label: string;
  audience: "Athlet" | "Sorgeberechtigte Person" | "E-Mail";
}> = [
  { id: "age-check", label: "1. Altersgruppe", audience: "Athlet" },
  { id: "guardian-contact", label: "2. Sorgeberechtigte Person", audience: "Athlet" },
  { id: "guardian-pending", label: "3. Bestätigung offen", audience: "Athlet" },
  { id: "guardian-email", label: "4. Einladungs-E-Mail", audience: "E-Mail" },
  { id: "guardian-review", label: "5. Entscheidung prüfen", audience: "Sorgeberechtigte Person" },
  { id: "guardian-complete", label: "6. Entscheidung fertig", audience: "Sorgeberechtigte Person" },
  { id: "athlete-assent", label: "7. Eigene Zustimmung", audience: "Athlet" },
  { id: "authorized", label: "8. Freigegeben", audience: "Athlet" },
  { id: "settings", label: "9. Konto-Status", audience: "Athlet" },
  { id: "guardian-declined", label: "Sonderfall: nicht erlaubt", audience: "Sorgeberechtigte Person" },
  { id: "athlete-declined", label: "Sonderfall: Athleten-Nein", audience: "Athlet" },
  { id: "revoked", label: "Sonderfall: Widerruf", audience: "Athlet" },
  { id: "expired", label: "Sonderfall: Link abgelaufen", audience: "Sorgeberechtigte Person" },
  { id: "age-16-17-decision", label: "Sonderfall: 16 bis 17", audience: "Athlet" },
  { id: "adult-ready", label: "Sonderfall: volljährig", audience: "Athlet" },
] as const;

export const guardianNoticeDraft = {
  subject: "Bitte prüfe die Nutzung von RewirePerform durch dein Kind",
  preheader: "Information und freiwillige Entscheidung ohne Elternkonto.",
  addressSource:
    "Dein Kind hat diese E-Mail-Adresse selbst in RewirePerform angegeben.",
  invitation:
    "Dein Kind möchte RewirePerform nutzen. Weil es unter 16 ist, bitten wir dich zuerst um eine informierte Entscheidung als sorgeberechtigte Person.",
  noPressure:
    "Die Teilnahme ist freiwillig. Ein Nein hat keine sportlichen Nachteile. Funktionen, die diese Daten benötigen, bleiben dann gesperrt.",
  noAccount:
    "Du brauchst kein Elternkonto. Der persönliche Link ist einmal nutzbar und läuft nach der angegebenen Frist ab.",
  emailPurpose:
    "Wir verwenden deine E-Mail-Adresse nur für diese Entscheidung, notwendige Sicherheitsnachrichten und einen möglichen Widerruf. Keine Werbung, kein Newsletter.",
  contact: "Fragen oder Widerruf: hello@rewireperform.com",
} as const;

export const guardianProductPurposeDraft = {
  title: "Worum es geht",
  summary:
    "RewirePerform begleitet Athletinnen und Athleten durch ein 56-Tage-Programm für mentale Leistungsfähigkeit und Reflexion im Sport. Es ist kein Medizinprodukt und stellt keine Diagnose.",
  dataGroups: [
    "Konto und Sportprofil: E-Mail, Rolle, Teamzuordnung und ausgewählte Profilangaben.",
    "Programmnutzung: aktueller Tag, erledigte Aufgaben, Fortschritt und freiwillige Erinnerungszeiten.",
    "Selbsteinschätzungen: Check-ins, Fragebögen und Assessments innerhalb des Programms.",
    "Private Reflexionen: Journal- und Freitexte für den persönlichen Rückblick des Athleten.",
  ],
  visibility: [
    "Private Journal- und Freitexte sind nicht für Trainer sichtbar und werden nicht für Teamstatistiken ausgewertet.",
    "Trainer sehen keine einzelnen Stimmungswerte, privaten Antworten oder individuellen Assessment-Scores.",
    "Freigegebene Teamwerte werden nur gruppiert und erst ab mindestens fünf berechtigten Personen angezeigt.",
  ],
  rights: [
    "Du und dein Kind könnt eine Entscheidung ohne Begründung widerrufen.",
    "Ihr könnt Auskunft, Berichtigung, Export oder Löschung anfragen.",
    "Ein Widerruf stoppt neue Verarbeitung für den widerrufenen Zweck.",
  ],
  support: [
    "Frag offen, wie sich das Programm anfühlt, ohne Antworten oder Ergebnisse einzufordern.",
    "Private Journaltexte und einzelne Check-ins bleiben der persönliche Bereich deines Kindes.",
    "Unterstütze eine ruhige Routine, aber mache weder Serien noch tägliche Nutzung zur Pflicht.",
    "Wenn sich dein Kind unwohl oder unter Druck fühlt, soll es pausieren und mit einer vertrauten Person sprechen.",
  ],
} as const;

export const guardianDecisionDraft = {
  guardianAttestation:
    "Ich bin für dieses Kind sorgeberechtigt und entscheide nicht im Namen einer anderen Person.",
  productAuthorization:
    "Ich habe die Informationen gelesen und erlaube die beschriebene Nutzung für das normale RewirePerform-Programm.",
  internalEvaluation:
    "Optional: RewirePerform darf ausgewählte Verlaufsdaten unter einer technischen Kennung statt mit Name oder E-Mail intern auswerten, um Datenqualität und Programmablauf zu prüfen.",
  evaluationNoDisadvantage:
    "Ein Nein hierzu ändert nichts am Programmzugang und hat keinen Nachteil im Team.",
  researchUnavailable:
    "Das Tracking unterstützt den Produktbetrieb, deinen Fortschritt und die Verbesserung des Programms. Eine spätere wissenschaftliche Studie würde eine neue, getrennte Information und Entscheidung erfordern.",
} as const;

export const athleteAssentDraft = {
  title: "Jetzt entscheidest auch du",
  intro:
    "Deine sorgeberechtigte Person hat zugestimmt. Du entscheidest trotzdem selbst, ob du mitmachen möchtest.",
  points: [
    "Du nutzt Übungen, Check-ins und Reflexionen für dein eigenes 56-Tage-Programm.",
    "Trainer sehen deine privaten Journaltexte und einzelnen persönlichen Antworten nicht.",
    "Du kannst Nein sagen oder später aufhören, ohne sportlichen Nachteil.",
    "Wenn dir eine Frage unangenehm ist, kannst du die App schließen und mit einer Person sprechen, der du vertraust.",
  ],
  assent:
    "Ich habe das verstanden, konnte Fragen stellen und möchte das normale RewirePerform-Programm freiwillig nutzen.",
} as const;

export const unresolvedMinorGuardianDecisions = [
  "Externe fachrechtliche Bestätigung der Rechtsgrundlagen je Datenart und Zweck",
  "Externe fachrechtliche Bestätigung der gewählten Sorgeberechtigten-Selbsterklärung",
  "Providerseitige Bestätigung der Backup-Rotation und E-Mail-Tracking-Konfiguration",
  "Widerrufswirkung auf bestehende Auswertungen und Exporte",
] as const;
