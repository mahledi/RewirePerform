export type JarvisReadModel = {
  overview: Record<string, unknown> | null;
  teams: unknown[] | null;
  system: Record<string, unknown> | null;
  operations: Record<string, unknown> | null;
};

export type JarvisAnswer = {
  intent: "overview" | "activity" | "feedback" | "comprehension" | "operations" | "solo";
  answer: string;
  sourceLabels: string[];
  boundary: string;
  externalAiCalls: 0;
};

const asNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const number = (record: Record<string, unknown> | null, key: string) =>
  asNumber(record?.[key]);

export const buildJarvisAnswer = (question: string, data: JarvisReadModel): JarvisAnswer => {
  const normalized = question.toLocaleLowerCase("de-DE");
  const boundary = "Deskriptive Auswertung ohne Freitext, Einzelprofil, Ursache oder Wirksamkeitsbehauptung.";
  const common = { boundary, externalAiCalls: 0 as const };

  if (normalized.includes("feedback") || normalized.includes("fragebogen")) {
    return {
      ...common,
      intent: "feedback",
      answer: "Die strukturierten Feedback-Verteilungen findest du im Tab Feedback Intelligence. Jarvis zeigt dort nur Gruppen ab n ≥ 5; Freitext bleibt vollständig ausgeschlossen.",
      sourceLabels: ["Strukturierte Feedback-RPC"],
    };
  }
  if (normalized.includes("verständ") || normalized.includes("verstaend") || normalized.includes("programm")) {
    return {
      ...common,
      intent: "comprehension",
      answer: "Das strukturierte Programmverständnis ist im Verständnis-Tab nach Woche, Tag und Frage zusammengefasst. Kleine Gruppen bleiben geschützt.",
      sourceLabels: ["Programmverständnis-RPC"],
    };
  }
  if (normalized.includes("solo") || normalized.includes("einzelathlet")) {
    return {
      ...common,
      intent: "solo",
      answer: "Solo-Athleten sind ein eigener Auswertungsmodus. Aktivität und strukturierte Antworten werden getrennt von Teams beschrieben; Gruppenmetriken erscheinen erst ab n ≥ 5.",
      sourceLabels: ["Solo-Readiness", "Strukturierte Feedback-RPC"],
    };
  }
  if (normalized.includes("aktiv") || normalized.includes("check-in") || normalized.includes("checkin")) {
    const checkins = number(data.overview, "total_checkins");
    const completed = number(data.overview, "total_completed_days");
    const athletes = number(data.overview, "total_athletes");
    return {
      ...common,
      intent: "activity",
      answer: `Aktuell sind ${athletes ?? "–"} Athleten erfasst. Insgesamt liegen ${checkins ?? "–"} Check-ins und ${completed ?? "–"} abgeschlossene Programmtage vor. Zeitliche Veränderungen werden erst mit gleich definierten Vergleichsfenstern bewertet.`,
      sourceLabels: ["Admin-Übersicht", "Team-Zusammenfassung"],
    };
  }
  if (normalized.includes("fehler") || normalized.includes("system") || normalized.includes("guardian") || normalized.includes("push")) {
    const failedEvents = number(data.operations, "failed_events_24h");
    const criticalEvents = number(data.operations, "critical_failed_events_24h");
    const missingRoles = number(data.system, "users_missing_role");
    return {
      ...common,
      intent: "operations",
      answer: `In 24 Stunden sind ${failedEvents ?? "–"} fehlgeschlagene Flow-Events dokumentiert, davon ${criticalEvents ?? "–"} kritisch. Nutzer ohne gültige Rolle: ${missingRoles ?? "–"}. Das beschreibt den Messstand und noch keine Ursache.`,
      sourceLabels: ["Systemgesundheit", "Launch-Ops"],
    };
  }

  const athletes = number(data.overview, "total_athletes");
  const teams = number(data.overview, "total_teams") ?? data.teams?.length ?? null;
  const activeTeams = number(data.overview, "active_teams");
  return {
    ...common,
    intent: "overview",
    answer: `Jarvis sieht aktuell ${athletes ?? "–"} Athleten, ${teams ?? "–"} Teams und ${activeTeams ?? "–"} aktive Teams über die read-only Admin-Quellen. Öffne einen Fach-Tab oder frage nach Aktivität, Feedback, Verständnis oder Systemzustand.`,
    sourceLabels: ["Admin-Übersicht", "Team-Zusammenfassung", "Systemgesundheit", "Launch-Ops"],
  };
};
