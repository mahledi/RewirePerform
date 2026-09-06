/**
 * Coach Toolkit — deterministische, hardcoded Inhalte.
 * KEIN AI-Call. Nur programm- und coach-facing Sprache.
 */

export interface TeamStandard {
  id: string;
  title: string;
  explanation: string;
}

export const TEAM_STANDARDS: TeamStandard[] = [
  {
    id: "mistakes-not-identity",
    title: "Fehler sind Information, nicht Identit\u00e4t.",
    explanation:
      "Athlet:innen sollten einen Fehler nicht so verlassen, als w\u00fcrde er definieren, wer er ist.",
  },
  {
    id: "next-action",
    title: "Nach einem Fehler z\u00e4hlt die n\u00e4chste Handlung.",
    explanation:
      "Das Programm trainiert wiederholt Return-to-Task-Verhalten.",
  },
  {
    id: "praise-behavior",
    title: "Verhalten loben, nicht nur Ergebnis.",
    explanation:
      "Talent- und Ergebnislob kann n\u00fctzlich sein, aber Verhaltenslob unterst\u00fctzt Lernen und wiederholbare Leistung.",
  },
  {
    id: "pressure-application",
    title: "Druck ist ein Ort zur Anwendung.",
    explanation:
      "Druck ist der Ort, an dem das System ge\u00fcbt wird, nicht der Ort, an dem Identit\u00e4t bewertet wird.",
  },
  {
    id: "private-stays-private",
    title: "Private Reflexion bleibt privat.",
    explanation:
      "Athlet:innen reflektieren nur ehrlich, wenn sie vertrauen, dass verletzliche Reflexionen nicht gegen sie verwendet werden.",
  },
];

export const COACH_JOURNAL_QUESTIONS = {
  gratitude:
    "Wof\u00fcr bin ich diese Woche in diesem Team ehrlich dankbar?",
  reflection_1:
    "Wo habe ich diese Woche Growth Mindset im Team verst\u00e4rkt?",
  reflection_2:
    "Wo habe ich m\u00f6glicherweise unbewusst Ergebnisdruck, Angst vor Fehlern oder Selbstbewertung verst\u00e4rkt?",
  reflection_3:
    "Welche Team-Situation h\u00e4tte ich besser f\u00fchren k\u00f6nnen, ohne Athlet:innen \u00f6ffentlich zu besch\u00e4men oder kleinzumachen?",
  action_commitment:
    "Welche eine Kommunikationsgewohnheit will ich n\u00e4chste Woche bewusst setzen?",
};
