import {
  Activity,
  BarChart3,
  Brain,
  ClipboardList,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import type { DemoCheckinKey, DemoCoachTab, DemoCheckinOption, DemoFlowStep, DemoMetric } from "../types";

export const demoFlowSteps: DemoFlowStep[] = [
  {
    id: "context",
    eyebrow: "Step 1",
    title: "Tageskontext",
    description: "Der Athlet sieht, welcher Mechanismus heute trainiert wird und was vor dem Training zählt.",
  },
  {
    id: "checkin",
    eyebrow: "Step 2",
    title: "Check-in",
    description: "Ein kurzer Zustand setzt den Tagesrahmen, ohne private Einzelprofile für den Coach zu öffnen.",
  },
  {
    id: "task",
    eyebrow: "Step 3",
    title: "Aufgabe",
    description: "Eine klare mentale Aufgabe übersetzt den Mechanismus in eine konkrete Handlung.",
  },
  {
    id: "science",
    eyebrow: "Step 4",
    title: "Science Bite",
    description: "Kurz, ruhig und mechanismusnah: warum diese Aufgabe im Training relevant ist.",
  },
  {
    id: "journal",
    eyebrow: "Step 5",
    title: "Reflexion",
    description: "Private Reflexion schließt den Tag ab. Der Coach sieht keine einzelnen Journaltexte.",
  },
];

export const checkinOptions: Record<DemoCheckinKey, DemoCheckinOption[]> = {
  energy: [
    { label: "niedrig", value: "low" },
    { label: "mittel", value: "medium" },
    { label: "hoch", value: "high" },
  ],
  focus: [
    { label: "unklar", value: "low" },
    { label: "stabil", value: "medium" },
    { label: "klar", value: "high" },
  ],
  pressure: [
    { label: "niedrig", value: "low" },
    { label: "mittel", value: "medium" },
    { label: "hoch", value: "high" },
  ],
  readiness: [
    { label: "schwer", value: "low" },
    { label: "bereit", value: "medium" },
    { label: "frisch", value: "high" },
  ],
};

export const checkinLabels: Record<DemoCheckinKey, string> = {
  energy: "Energie",
  focus: "Fokus",
  pressure: "Druck",
  readiness: "Körperliche Bereitschaft",
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

export const timelineSteps = [
  "Athlet öffnet Daily Flow",
  "Check-in setzt den Tageskontext",
  "Aufgabe trainiert einen Mechanismus",
  "Science Bite erklärt den Hintergrund",
  "Journal schließt den Tag ruhig ab",
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

