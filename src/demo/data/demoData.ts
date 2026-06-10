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
    description: "Der Tag startet mit einem kurzen Mechanismus, der die Denkaufgabe fachlich einordnet.",
  },
  {
    id: "today",
    eyebrow: "Step 2",
    title: "Heute für dich",
    description: "Der Athlet bekommt einen ruhigen Tagesrahmen, ohne dass Tasks oder Inhalte verändert werden.",
  },
  {
    id: "checkin",
    eyebrow: "Step 3",
    title: "Check-in",
    description: "Der echte Flow arbeitet mit Skalen und Tageszustand, nicht mit einem privaten Coach-Profil.",
  },
  {
    id: "task",
    eyebrow: "Step 4",
    title: "Denkaufgabe",
    description: "Die Aufgabe besteht aus Warum, Auslöser, konkreter Handlung, Reframing und Self-Talk.",
  },
  {
    id: "journal",
    eyebrow: "Step 5",
    title: "Verständnis & Reflexion",
    description: "Verständnis-Check und Journal schließen den Tag ab; private Texte bleiben privat.",
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
  title: "Dein Gehirn bewertet schneller, als du bewusst denkst.",
  body:
    "Nach Fehlern springt Aufmerksamkeit oft zu Bedeutung und Bewertung: Was war das? Was sagt das über mich? RewirePerform trainiert an solchen Tagen den Wechsel von Urteil zu Information. Dadurch wird die nächste Handlung wieder greifbarer.",
};

export const coachTabs: DemoCoachTab[] = [
  { id: "overview", label: "Übersicht", Icon: Activity },
  { id: "readiness", label: "Mental & Bereitschaft", Icon: Brain },
  { id: "evidence", label: "Wirksamkeit", Icon: BarChart3 },
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
  { label: "Fehlererholung", pre: 42, mid: 58, post: 66 },
  { label: "Prozessfokus", pre: 48, mid: 61, post: 69 },
  { label: "Druckregulation", pre: 39, mid: 54, post: 62 },
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
  { Icon: Sparkles, title: "Täglich nutzbar", text: "kurzer Flow statt überladener Theorie" },
  { Icon: ShieldCheck, title: "Rollenbasiert", text: "Orientierung für Coaches, Privatsphäre für Athleten" },
  { Icon: BarChart3, title: "Entwicklung sichtbar", text: "Beispielwerte, Missingness und Fortschritt ohne Rohinhalte" },
];
