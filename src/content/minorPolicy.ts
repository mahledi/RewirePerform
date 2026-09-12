export const MINOR_PRODUCT_POLICY_VERSION = "minor_product_v1_2026_07";
export const GUARDIAN_NOTICE_VERSION = "guardian_notice_v2_2026_07";
export const GUARDIAN_DECISION_VERSION = "guardian_decision_v2_2026_07";
export const ATHLETE_ASSENT_VERSION = "athlete_assent_v2_2026_07";
export const MINOR_DATA_CONTRIBUTION_VERSION = "data_contribution_v3_2026_07";
export const MINOR_POLICY_KEY = "de_minor_product_v2_2026_07";
export const MINOR_POLICY_CONTENT_HASH = "7b722f4ef844bcc8bba0a0feaf86a0f2c7e60039b33f4f9381c884e37d0f075d";

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
    "Für den RewirePerform-Pilot kann zusätzlich erlaubt werden, ausgewählte strukturierte Fortschritts- und Performancedaten auszuwerten. Diese Entscheidung ist freiwillig, getrennt widerrufbar und verändert die normale Programmnutzung nicht.",
} as const;

export const guardianNoticePolicyCopy = {
  source:
    "Die minderjährige Person hat die E-Mail-Adresse selbst in RewirePerform angegeben.",
  purpose:
    "Der persönliche Link erklärt das 56-Tage-Performance-Programm, die Datenverarbeitung, die Trainer-Sicht und die getrennte Pilot-Auswertung.",
  validity:
    "Der Entscheidungslink ist 48 Stunden gültig und kann nur einmal verwendet werden. Es wird kein Elternkonto erstellt.",
  confidentiality:
    "Trainer und Verein erhalten weder die E-Mail-Adresse der sorgeberechtigten Person noch ihre Entscheidung.",
  retention:
    "Die verschlüsselte Kopie der E-Mail-Adresse wird im RewirePerform-Autorisierungssystem spätestens sieben Tage nach Erstellung gelöscht und nicht für Marketing verwendet.",
  controller:
    "Verantwortlich ist Mahle Herzog, Wiefeldick 16, 42699 Solingen, Deutschland. Kontakt: support@rewireperform.com.",
} as const;

export const guardianPolicyCopy = {
  title: "RewirePerform sicher freigeben",
  introduction:
    "Der Verein ist an diesem Ablauf nicht beteiligt und erhält weder deine E-Mail-Adresse noch deine Entscheidung.",
  declaration:
    "Ich bestätige, dass ich für die minderjährige Person sorgeberechtigt bin und diese Entscheidung treffen darf.",
  productLabel: "Nutzung des RewirePerform-Programms erlauben",
  productDetail:
    "Damit werden die für das Konto und das 56-Tage-Programm erforderlichen Daten verarbeitet. Die minderjährige Person muss danach zusätzlich selbst zustimmen.",
  contributionLabel: "Teilnahme an der Pilot-Auswertung erlauben",
  contributionDetail:
    "Strukturierte Nutzungs-, Fortschritts-, Check-in-, Assessment-, Transfer-Pulse- und freigegebene Coach-Beobachtungsdaten dürfen für interne Pilot-Analysen sowie nicht identifizierende Pilotberichte und Präsentationen ausgewertet werden. Journal- und Freitexte bleiben ausgeschlossen.",
  declineDetail:
    "Bei einem Nein zur Programmnutzung bleiben datenabhängige Programmfunktionen gesperrt. Ein Nein zur getrennten Pilot-Auswertung hat keinen Einfluss auf Programm, Aufgaben oder sportliche Teilnahme.",
} as const;

export const guardianPolicyDetails = {
  dataGroups: [
    "Konto und Sportprofil: E-Mail, Rolle, Teamzuordnung und ausgewählte Profilangaben.",
    "Programmnutzung: aktueller Tag, Aufgaben, Tagesabschlüsse, Fortschritt, aktuelle Serie und optionale Erinnerungszeiten.",
    "Selbsteinschätzungen: Check-ins, Fragebögen, Assessments und Verständnischecks innerhalb des Programms.",
    "Pilotmessungen bei getrennter Freigabe: kurze strukturierte Transfer-Pulse in Training oder Wettkampf sowie strukturierte Team- und geschützte Einzelbeobachtungen durch Trainer.",
    "Private Reflexionen: Journal- und Freitexte werden gespeichert, damit die minderjährige Person sie selbst wieder lesen kann; sie werden nicht ausgewertet.",
    "Benachrichtigungen: Wenn Erinnerungen aktiviert werden, speichert das System Push-Berechtigung, Erinnerungszeit sowie Versand-, Öffnungs- und Fehlerstatus. Private Inhalte werden nicht in Benachrichtigungen aufgenommen.",
  ],
  recipients: [
    "Supabase stellt Authentifizierung, Datenbank und Edge Functions bereit.",
    "Vercel liefert die Web-App aus und verarbeitet technisch notwendige Anfrage- und Sicherheitsdaten.",
    "Resend erhält die E-Mail-Adresse der sorgeberechtigten Person ausschließlich für transaktionale Einladungs- und Bestätigungs-E-Mails ohne Open- oder Link-Tracking.",
  ],
  rights: [
    "Die Programmfreigabe und die getrennte Pilot-Auswertung können über den persönlichen Widerrufslink, in der App oder per E-Mail an support@rewireperform.com widerrufen werden.",
    "Auskunft, Berichtigung, Datenübertragbarkeit und Löschung können über support@rewireperform.com verlangt werden.",
    "Ein Nein zur Pilot-Auswertung ändert nichts am normalen Programm und hat keinen sportlichen Nachteil.",
  ],
  retention: [
    "Einladungsdaten einschließlich der verschlüsselten Kopie der E-Mail-Adresse werden im RewirePerform-Autorisierungssystem spätestens sieben Tage nach Erstellung gelöscht.",
    "Der nur gehasht gespeicherte Widerrufslink bleibt bis zu 370 Tage aktiv und wird nach Nutzung, Widerruf oder Ablauf innerhalb von sieben Tagen gelöscht.",
    "Minimierte Entscheidungsnachweise ohne E-Mail-Adresse der sorgeberechtigten Person werden bis zu drei Jahre ab der jeweiligen Entscheidung gespeichert.",
    "Personenbeziehbare Pilotdaten bleiben höchstens bis zum dokumentierten Ende des freigegebenen Pilotprotokolls gespeichert. Bei Widerruf werden sie aus neuen Auswertungen ausgeschlossen und die personenbezogenen Transferdaten entfernt; bereits gebildete anonyme Gruppenaggregate können bestehen bleiben.",
  ],
  controller:
    "Verantwortlicher ist Mahle Herzog, handelnd unter RewirePerform, Wiefeldick 16, 42699 Solingen, Deutschland. Datenschutzkontakt: support@rewireperform.com.",
  evidenceBoundary:
    "Wenn die erforderlichen Entscheidungen vorliegen, wird die getrennte Pilot-Auswertung für diese Person aktiviert. Sie dient der internen Bewertung von Nutzung, Datenqualität und beobachteten Veränderungen sowie nicht identifizierenden Pilotberichten und Präsentationen. Gruppenwerte werden erst ab mindestens fünf freigegebenen Personen ausgegeben. Die Daten belegen für sich allein weder Ursache noch sportliche Leistungssteigerung. Eine externe wissenschaftliche Studie oder eine weitergehende Forschungsnutzung erfordert eine neue, getrennte Information und Entscheidung.",
} as const;

export const athletePolicyCopy = {
  title: "Du entscheidest auch selbst",
  introduction:
    "Eine sorgeberechtigte Person kann den Zugang erlauben. Trotzdem wird nichts freigeschaltet, bevor du selbst verstanden und zugestimmt hast.",
  productLabel: "Ich möchte RewirePerform nutzen",
  productDetail:
    "Ich habe verstanden, welche Programmdaten gespeichert werden und was Trainer sehen. Meine privaten Journaltexte und Einzelantworten bleiben privat.",
  contributionLabel: "Ich möchte an der Pilot-Auswertung teilnehmen",
  contributionDetail:
    "Strukturierte Fortschritts-, Check-in-, Assessment- und Transferdaten dürfen für interne Pilot-Analysen und nicht identifizierende Berichte ausgewertet werden. Journal- und Freitexte bleiben ausgeschlossen. Diese Entscheidung ist freiwillig und jederzeit widerrufbar; ein Nein ändert nichts an meinem Programm.",
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
