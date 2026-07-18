export const MINOR_PRODUCT_POLICY_VERSION = "minor_product_v1_2026_07";
export const GUARDIAN_NOTICE_VERSION = "guardian_notice_v1_2026_07";
export const GUARDIAN_DECISION_VERSION = "guardian_decision_v1_2026_07";
export const ATHLETE_ASSENT_VERSION = "athlete_assent_v1_2026_07";
export const MINOR_DATA_CONTRIBUTION_VERSION = "data_contribution_v2_2026_07";
export const MINOR_POLICY_KEY = "de_minor_product_v1_2026_07";
export const MINOR_POLICY_CONTENT_HASH = "f2fb64cc68d5808147b60972f500ffa4cdc9440143df9d700c4c123f063f8ae8";

export const minorProductSummary = {
  title: "RewirePerform sicher nutzen",
  purpose:
    "RewirePerform begleitet ein 56-Tage-Programm für sportliche Performance, Fokus und den Umgang mit Druck und Fehlern.",
  productTracking:
    "Damit das Programm funktioniert, speichert das System unter anderem Programmtag, Tagesabschlüsse, Check-ins, Aufgaben, Assessments und Fortschritt.",
  privateContent:
    "Private Journaltexte, Freitexte und einzelne persönliche Antworten bleiben privat. Trainer sehen diese Inhalte und einzelne Werte zu Stimmung, Energie, Fokus oder aus Assessments nicht.",
  coachVisibility:
    "Trainer sehen nur operative Teilnahmeinformationen wie letzte Aktivität, erledigte Tage, Abschlussquote, aktuelle Serie sowie reine Check-in- und Journal-Anzahlen. Teamwerte werden erst ab mindestens fünf freigegebenen Personen gebildet.",
  noMedicalUse:
    "Die App stellt keine Diagnose, ersetzt keine Behandlung und ist kein Krisendienst.",
  voluntaryContribution:
    "Zusätzlich kann freiwillig erlaubt werden, ausgewählte Fortschrittsdaten gruppiert für Produkt- und Performance-Optimierung auszuwerten. Ein Nein verändert die normale Programmnutzung nicht.",
} as const;

export const guardianNoticePolicyCopy = {
  source:
    "Eine minderjährige Person hat die E-Mail-Adresse selbst in RewirePerform angegeben.",
  purpose:
    "Der persönliche Link erklärt, welche Daten das Performance-Programm verarbeitet, was Trainer sehen und was privat bleibt.",
  validity:
    "Der Entscheidungslink ist 48 Stunden gültig und kann nur einmal verwendet werden. Es wird kein Elternkonto erstellt.",
  confidentiality:
    "Trainer und Verein erhalten weder die E-Mail-Adresse der sorgeberechtigten Person noch ihre Entscheidung.",
  retention:
    "Die verschlüsselte Kopie der E-Mail-Adresse wird im RewirePerform-Autorisierungssystem spätestens sieben Tage nach Erstellung gelöscht und nicht für Marketing verwendet.",
  controller:
    "Verantwortlich ist Mahle Herzog, Wiefeldick 16, 42699 Solingen, Deutschland. Kontakt: hello@rewireperform.com.",
} as const;

export const guardianPolicyCopy = {
  title: "Entscheidung für eine minderjährige Person",
  introduction:
    "Eine minderjährige Person hat deine E-Mail-Adresse selbst angegeben. Der Verein ist an diesem Ablauf nicht beteiligt und erhält weder deine E-Mail-Adresse noch deine Entscheidung.",
  declaration:
    "Ich bestätige, dass ich für die minderjährige Person sorgeberechtigt bin und diese Entscheidung treffen darf.",
  productLabel: "Nutzung des RewirePerform-Programms erlauben",
  productDetail:
    "Damit werden die für das Konto und das 56-Tage-Programm erforderlichen Daten verarbeitet. Die minderjährige Person muss danach zusätzlich selbst zustimmen.",
  contributionLabel: "Gruppierte Performance-Auswertung zusätzlich erlauben",
  contributionDetail:
    "Ausgewählte Nutzungs-, Fortschritts-, Check-in- und Assessmentdaten dürfen nur gruppiert und mit mindestens fünf freigegebenen Personen ausgewertet werden. Journal- und Freitexte bleiben ausgeschlossen.",
  declineDetail:
    "Bei einem Nein bleiben datenabhängige Programmfunktionen gesperrt. Es entstehen keine sportlichen Nachteile.",
} as const;

export const guardianPolicyDetails = {
  dataGroups: [
    "Konto und Sportprofil: E-Mail, Rolle, Teamzuordnung und ausgewählte Profilangaben.",
    "Programmnutzung: aktueller Tag, Aufgaben, Tagesabschlüsse, Fortschritt, aktuelle Serie und optionale Erinnerungszeiten.",
    "Selbsteinschätzungen: Check-ins, Fragebögen, Assessments und Verständnischecks innerhalb des Programms.",
    "Private Reflexionen: Journal- und Freitexte werden gespeichert, damit die minderjährige Person sie selbst wieder lesen kann; sie werden nicht ausgewertet.",
    "Benachrichtigungen: Wenn Erinnerungen aktiviert werden, speichert das System Push-Berechtigung, Erinnerungszeit sowie Versand-, Öffnungs- und Fehlerstatus. Private Inhalte werden nicht in Benachrichtigungen aufgenommen.",
  ],
  recipients: [
    "Supabase stellt Authentifizierung, Datenbank und Edge Functions bereit.",
    "Vercel liefert die Web-App aus und verarbeitet technisch notwendige Anfrage- und Sicherheitsdaten.",
    "Resend erhält die E-Mail-Adresse der sorgeberechtigten Person ausschließlich für transaktionale Einladungs- und Bestätigungs-E-Mails ohne Open- oder Link-Tracking.",
  ],
  rights: [
    "Die Freigabe kann über den persönlichen Widerrufslink, in der App oder per E-Mail an hello@rewireperform.com widerrufen werden.",
    "Auskunft, Berichtigung, Datenübertragbarkeit und Löschung können über hello@rewireperform.com verlangt werden.",
    "Ein Nein zum freiwilligen Datenbeitrag ändert nichts am normalen Programm und hat keinen sportlichen Nachteil.",
  ],
  retention: [
    "Einladungsdaten einschließlich der verschlüsselten Kopie der E-Mail-Adresse werden im RewirePerform-Autorisierungssystem spätestens sieben Tage nach Erstellung gelöscht.",
    "Der nur gehasht gespeicherte Widerrufslink bleibt bis zu 370 Tage aktiv und wird nach Nutzung, Widerruf oder Ablauf innerhalb von sieben Tagen gelöscht.",
    "Minimierte Entscheidungsnachweise ohne E-Mail-Adresse der sorgeberechtigten Person werden bis zu drei Jahre ab der jeweiligen Entscheidung gespeichert.",
  ],
  controller:
    "Verantwortlicher ist Mahle Herzog, handelnd unter RewirePerform, Wiefeldick 16, 42699 Solingen, Deutschland. Datenschutzkontakt: hello@rewireperform.com.",
  evidenceBoundary:
    "Die derzeitige zusätzliche Transfer-Auswertung für Nachweiszwecke ist für Minderjährige deaktiviert. Eine spätere wissenschaftliche Studie oder weitergehende Forschungsnutzung würde eine neue, getrennte Information und Entscheidung erfordern.",
} as const;

export const athletePolicyCopy = {
  title: "Du entscheidest auch selbst",
  introduction:
    "Eine sorgeberechtigte Person kann den Zugang erlauben. Trotzdem wird nichts freigeschaltet, bevor du selbst verstanden und zugestimmt hast.",
  productLabel: "Ich möchte RewirePerform nutzen",
  productDetail:
    "Ich habe verstanden, welche Programmdaten gespeichert werden und was Trainer sehen. Meine privaten Journaltexte und Einzelantworten bleiben privat.",
  contributionLabel: "Meine Daten dürfen gruppiert zur Verbesserung beitragen",
  contributionDetail:
    "Diese zusätzliche Entscheidung ist freiwillig. Ein Nein ändert nichts an meinem Programm, meinen Aufgaben oder meinem Fortschritt.",
} as const;

export const minorPolicyCanonicalDocument = {
  policyKey: MINOR_POLICY_KEY,
  jurisdiction: "DE",
  versions: {
    product: MINOR_PRODUCT_POLICY_VERSION,
    guardianNotice: GUARDIAN_NOTICE_VERSION,
    guardianDecision: GUARDIAN_DECISION_VERSION,
    athleteAssent: ATHLETE_ASSENT_VERSION,
    dataContribution: MINOR_DATA_CONTRIBUTION_VERSION,
  },
  product: minorProductSummary,
  guardianNotice: guardianNoticePolicyCopy,
  guardian: guardianPolicyCopy,
  guardianDetails: guardianPolicyDetails,
  athlete: athletePolicyCopy,
} as const;
