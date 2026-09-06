import {
  Activity,
  BarChart3,
  Brain,
  ClipboardList,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import type { DemoCheckinKey, DemoCoachTab, DemoFlowStep, DemoMetric } from "../types";

export const demoFlowSteps: DemoFlowStep[] = [
  {
    id: "science",
    eyebrow: "Step 1",
    title: "Science Bite",
    description: "Der Tag startet mit einem kurzen Mechanismus, der die heutige Mission verständlich einordnet.",
  },
  {
    id: "checkin",
    eyebrow: "Step 2",
    title: "Dein Tages-Puls",
    description: "Zehn kurze Fragen erfassen den heutigen Zustand, ohne daraus ein psychologisches Profil zu machen.",
  },
  {
    id: "today",
    eyebrow: "Step 3",
    title: "Heute für dich",
    description: "Ein klarer Satz verbindet den Mechanismus mit der nächsten beeinflussbaren Handlung.",
  },
  {
    id: "task",
    eyebrow: "Step 4",
    title: "Deine Mission",
    description: "Eine Mission bündelt Warum, Auslöser und konkrete Handlung zu einer Linie für den Tag.",
  },
  {
    id: "comprehension",
    eyebrow: "Step 5",
    title: "Verständnis-Check",
    description: "Eine kurze Frage festigt die heutige Linie. Kein Test und keine Bewertung der Person.",
  },
  {
    id: "completion",
    eyebrow: "Step 6",
    title: "Abschluss",
    description: "Der Daily Flow endet klar. Das private Journal bleibt ein eigener Tagesabschluss am Abend.",
  },
];

export const checkinDefaults: Record<DemoCheckinKey, number> = {
  energy: 6,
  focus: 7,
  pressure: 6,
  readiness: 6,
};

export const checkinLabels: Record<DemoCheckinKey, string> = {
  energy: "Energie",
  focus: "Fokusklarheit",
  pressure: "Druck",
  readiness: "Körperliche Bereitschaft",
};

export const demoDailyTask = {
  title: "Information statt Urteil",
  why:
    "Diese Aufgabe trainiert, einen Fehler nicht sofort als Bewertung über dich zu lesen, sondern als konkrete Information für die nächste Handlung.",
  trigger:
    "Wenn heute im Training ein Fehler passiert oder du merkst, dass dein Kopf im Urteil hängen bleibt.",
  concreteAction:
    "Benenne innerlich eine Sache, die du aus der Situation lernen kannst, und richte dich dann auf die nächste kontrollierbare Aktion aus.",
  reframeStep: {
    trigger: "Wenn ein Fehler passiert, will dein Kopf daraus schnell ein Urteil machen.",
    reframe: "Ein Fehler ist zuerst Information, nicht Identität.",
    anchor: "Heute gilt: Ich suche die nächste nutzbare Information.",
  },
  selfTalk: "Information, dann nächste Aktion.",
  microReframe:
    "Du musst den Fehler nicht schönreden. Du nutzt ihn nur präziser, damit er nicht länger als nötig dein Verhalten steuert.",
};

export const demoScienceBite = {
  title: "Nach einem Fehler sucht der Kopf schnell nach Bedeutung.",
  body:
    "Nach Fehlern springt Aufmerksamkeit oft zu Bewertung: Was war das? Was sagt das über mich? Die heutige Mission übt, zuerst eine nutzbare Information zu finden und dann die nächste Handlung zu wählen.",
};

export const coachTabs: DemoCoachTab[] = [
  { id: "overview", label: "Übersicht", Icon: Activity },
  { id: "readiness", label: "Mental & Bereitschaft", Icon: Brain },
  { id: "evidence", label: "Entwicklung", Icon: BarChart3 },
  { id: "toolkit", label: "Coach Toolkit", Icon: ClipboardList },
  { id: "teams", label: "Teams", Icon: Users },
];

export const overviewMetrics: DemoMetric[] = [
  { label: "Athleten", value: "18", detail: "Demo Team" },
  { label: "Aktiv heute", value: "14/18", detail: "Check-in oder Flow geöffnet" },
  { label: "Daily Flow", value: "78%", detail: "heute abgeschlossen" },
  { label: "Nächster Termin", value: "17:30", detail: "Training heute" },
];

export const evidenceBars = [
  { label: "Programmtage genutzt", value: 12, max: 14, detail: "im aktuellen Zeitraum" },
  { label: "Missionen abgeschlossen", value: 11, max: 14, detail: "Status, keine Inhaltswertung" },
  { label: "Team-Reviews beantwortet", value: 2, max: 2, detail: "geschützter Team-Prozess" },
];

export const coachSees = [
  "Teilnahme und Adherence",
  "aggregierte Team-Signale",
  "Programmfortschritt",
  "Teamkalender-Kontext",
  "anonymisierte Entwicklung, wenn vorgesehen",
];

export const coachDoesNotSee = [
  "private Journaltexte",
  "rohe persönliche Reflexionen",
  "sensible Einzelantworten ohne klare Grundlage",
  "Diagnosen oder medizinische Aussagen",
  "private Freitexte einzelner Athleten",
];

export const demoHighlights = [
  { Icon: Sparkles, title: "Im Alltag nutzbar", text: "klare Missionen statt überladener Theorie" },
  { Icon: ShieldCheck, title: "Rollenbasiert", text: "Orientierung für Coaches, Privatsphäre für Athleten" },
  { Icon: BarChart3, title: "Verlauf sichtbar", text: "Nutzung, Teilnahme und Programmfortschritt ohne private Rohinhalte" },
];
