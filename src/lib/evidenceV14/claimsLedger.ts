import type { ClaimClass } from "./measurementContract";

export type ClaimLedgerEntry = {
  claimClass: ClaimClass;
  label: string;
  permittedMeaning: string;
  requiredEvidence: string;
  active: boolean;
  prohibitedLanguage: string[];
};

export const EVIDENCE_V14_CLAIMS_LEDGER: ClaimLedgerEntry[] = [
  {
    claimClass: "use",
    label: "Nutzung",
    permittedMeaning: "Beschreibt ausschließlich, ob und wie das Programm genutzt wurde.",
    requiredEvidence: "Berechtigte, consentierte und QA-bereinigte Aktivitätsdaten.",
    active: true,
    prohibitedLanguage: ["wirksam", "verbessert", "verursacht"],
  },
  {
    claimClass: "self_reported_change",
    label: "Selbstberichtete Veränderung",
    permittedMeaning: "Beschreibt Veränderung derselben Person im selben Messvertrag.",
    requiredEvidence: "Vergleichbares Pre/Mid/Post-Paar mit Messqualität und Vollständigkeit.",
    active: false,
    prohibitedLanguage: ["objektiv bewiesen", "diagnostiziert", "verursacht"],
  },
  {
    claimClass: "triangulated_change",
    label: "Triangulierte Veränderung",
    permittedMeaning: "Mehrere getrennte Quellen zeigen eine ähnliche Richtung; keine Quelle ersetzt die andere.",
    requiredEvidence: "Mindestens zwei unabhängige Quellenfamilien mit vergleichbarem Zeitraum.",
    active: false,
    prohibitedLanguage: ["objektive Wahrheit", "psychologisches Profil", "verursacht"],
  },
  {
    claimClass: "association",
    label: "Zusammenhang",
    permittedMeaning: "Zwei beobachtete Größen hängen im vorliegenden Datensatz zusammen.",
    requiredEvidence: "Vorab definierte Analyse, Unsicherheit, Missingness und plausible Alternativerklärungen.",
    active: false,
    prohibitedLanguage: ["führt zu", "beweist", "Wirkung"],
  },
  {
    claimClass: "causality",
    label: "Kausalität",
    permittedMeaning: "RewirePerform hat die beobachtete Veränderung verursacht.",
    requiredEvidence: "Angemessenes Vergleichsdesign, unabhängige Prüfung und separate Freigabe.",
    active: false,
    prohibitedLanguage: ["verursacht", "garantiert", "nachgewiesene Wirkung"],
  },
];

export const isClaimClassActive = (claimClass: ClaimClass) =>
  EVIDENCE_V14_CLAIMS_LEDGER.find((entry) => entry.claimClass === claimClass)?.active === true;
