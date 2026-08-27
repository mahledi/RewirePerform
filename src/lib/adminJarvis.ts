export type JarvisRecord = Record<string, unknown>;

export type JarvisReadModel = {
  overview: JarvisRecord | null;
  teams: unknown[] | null;
  system: JarvisRecord | null;
  operations: JarvisRecord | null;
  presentation: JarvisRecord | null;
  study: JarvisRecord | null;
  solo: JarvisRecord | null;
};

export type JarvisAnswer = {
  intent: "overview" | "activity" | "feedback" | "comprehension" | "operations" | "solo" | "teams" | "quality" | "measurement";
  answer: string;
  sourceLabels: string[];
  boundary: string;
  externalAiCalls: 0;
};

export type JarvisTeamMetric = {
  label: string;
  athletes: number;
  completion: number | null;
  comprehension: number | null;
  completedDays: number | null;
};

const asRecord = (value: unknown): JarvisRecord | null =>
  value && typeof value === "object" && !Array.isArray(value) ? value as JarvisRecord : null;

const asRecords = (value: unknown): JarvisRecord[] =>
  Array.isArray(value) ? value.map(asRecord).filter((row): row is JarvisRecord => row !== null) : [];

const asNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const number = (record: JarvisRecord | null, key: string) => asNumber(record?.[key]);
const nested = (record: JarvisRecord | null, key: string) => asRecord(record?.[key]);
const percent = (value: number | null) => value === null ? "–" : `${Math.round(value * 100)} %`;

export const getJarvisTeamMetrics = (data: JarvisReadModel): JarvisTeamMetric[] => {
  const studyTeams = asRecords(data.study?.team_summaries);
  const presentationTeams = asRecords(data.presentation?.team_summaries);
  const rows = studyTeams.length > 0 ? studyTeams : presentationTeams;
  return rows.map((row) => ({
    label: typeof row.team === "string" ? row.team : "Team",
    athletes: asNumber(row.athlete_count) ?? 0,
    completion: asNumber(row.avg_completion_rate),
    comprehension: asNumber(row.avg_comprehension),
    completedDays: asNumber(row.completed_days),
  })).filter((row) => row.athletes >= 5);
};

export const buildJarvisAnswer = (question: string, data: JarvisReadModel): JarvisAnswer => {
  const normalized = question.toLocaleLowerCase("de-DE");
  const boundary = "Deskriptive Auswertung ohne Freitext, Einzelprofil, Ursache oder Wirksamkeitsbehauptung.";
  const common = { boundary, externalAiCalls: 0 as const };
  const activation = nested(data.study, "activation");
  const activity = nested(data.study, "activity") ?? nested(data.presentation, "activity");
  const quality = nested(data.study, "data_quality") ?? data.system;
  const measurement = nested(data.study, "measurement_readiness");

  if (normalized.includes("feedback") || normalized.includes("fragebogen")) {
    return { ...common, intent: "feedback", answer: "Die strukturierten Feedback-Verteilungen stehen im Tab Feedback Intelligence. Jarvis zeigt nur freigegebene Gruppen ab n ≥ 5; Freitext bleibt vollständig ausgeschlossen.", sourceLabels: ["Strukturierte Feedback-RPC"] };
  }
  if (normalized.includes("verständ") || normalized.includes("verstaend")) {
    const average = number(activity, "avg_comprehension");
    return { ...common, intent: "comprehension", answer: `Das aggregierte Programmverständnis liegt aktuell bei ${percent(average)}. Im Verständnis-Tab siehst du Woche, Tag und Fragen mit Klärungsbedarf; kleine Gruppen bleiben geschützt.`, sourceLabels: ["Programmverständnis", "Pilot-Auswertung"] };
  }
  if (normalized.includes("solo") || normalized.includes("einzelathlet")) {
    const sample = nested(data.solo, "sample");
    const coverage = nested(data.solo, "coverage");
    const eligible = number(sample, "eligible_participants");
    const answer = eligible !== null && eligible >= 5
      ? `Solo-Athleten bleiben ein eigener Auswertungsmodus. Aktuell sind ${eligible} Teilnehmende für die geschützte Solo-Auswertung freigegeben; dokumentierte strukturierte Beobachtungen: ${number(sample, "total_observations") ?? "–"}. Abdeckung: ${percent(number(coverage, "transfer_completion_rate"))}.`
      : "Solo-Athleten bleiben ein eigener Auswertungsmodus. Die Gruppe liegt noch unter der Jarvis-Ausgabegrenze n ≥ 5; deshalb werden keine Aktivitäts- oder Transferdetails ausgegeben.";
    return { ...common, intent: "solo", answer, sourceLabels: ["Solo-Evidence-Aggregat"] };
  }
  if (normalized.includes("trend") || normalized.includes("hoch") || normalized.includes("runter") || normalized.includes("entwicklung")) {
    const active7d = number(activation, "active_7d");
    const active28d = number(activation, "active_28d");
    return { ...common, intent: "activity", answer: `In den letzten 7 Tagen waren ${active7d ?? "–"} Athleten aktiv, in den letzten 28 Tagen ${active28d ?? "–"}. Diese Zeitfenster überlappen; daraus behauptet Jarvis bewusst noch keinen Hoch- oder Runter-Trend. Dafür fehlen gleich große, serverseitig berechnete Vergleichsfenster.`, sourceLabels: ["Pilot-Aktivität"] };
  }
  if (normalized.includes("aktiv") || normalized.includes("check-in") || normalized.includes("checkin")) {
    const checkins = number(activity, "checkins_total") ?? number(data.overview, "total_checkins");
    const completed = number(activity, "completed_days_total") ?? number(data.overview, "total_completed_days");
    const active7d = number(activation, "active_7d");
    return { ...common, intent: "activity", answer: `Aktuell liegen ${checkins ?? "–"} Check-ins und ${completed ?? "–"} abgeschlossene Programmtage vor. ${active7d ?? "–"} Athleten waren in den letzten 7 Tagen aktiv. Das ist der aktuelle Messstand, keine Ursachenbewertung.`, sourceLabels: ["Pilot-Aktivität", "Admin-Übersicht"] };
  }
  if (normalized.includes("team") || normalized.includes("mannschaft")) {
    const teams = getJarvisTeamMetrics(data);
    return { ...common, intent: "teams", answer: `Auswertbare Teamgruppen: ${teams.length}. Diese erfüllen aktuell die Jarvis-Ausgabegrenze n ≥ 5. Verglichen werden nur Completion und Verständnis; kleinere Teams bleiben ausgeblendet.`, sourceLabels: ["Team-Aggregate"] };
  }
  if (normalized.includes("datenqualität") || normalized.includes("datenqualitaet") || normalized.includes("lücke") || normalized.includes("luecke")) {
    const withoutRun = number(quality, "athletes_without_program_instance");
    const withoutDay1 = number(quality, "athletes_without_day_1");
    const withoutActivity = number(quality, "athletes_without_any_activity");
    return { ...common, intent: "quality", answer: `Datenlücken: Athleten ohne Programmlauf: ${withoutRun ?? "–"}; ohne abgeschlossenen Tag 1: ${withoutDay1 ?? "–"}; ohne gemessene Aktivität: ${withoutActivity ?? "–"}.`, sourceLabels: ["Datenqualität", "Systemgesundheit"] };
  }
  if (normalized.includes("mess") || normalized.includes("pre") || normalized.includes("post")) {
    return { ...common, intent: "measurement", answer: `Vollständige validierte Messungen: Pre ${number(measurement, "validated_assessments_pre_n") ?? "–"}, Mid ${number(measurement, "validated_assessments_mid_n") ?? "–"}, Post ${number(measurement, "validated_assessments_post_n") ?? "–"}. Das beschreibt Verfügbarkeit, nicht Wirksamkeit.`, sourceLabels: ["Messfenster-Readiness"] };
  }
  if (normalized.includes("fehler") || normalized.includes("system") || normalized.includes("guardian") || normalized.includes("push")) {
    const failedEvents = number(data.operations, "failed_events_24h");
    const criticalEvents = number(data.operations, "critical_failed_events_24h");
    const missingRoles = number(data.system, "users_missing_role");
    return { ...common, intent: "operations", answer: `In 24 Stunden sind ${failedEvents ?? "–"} fehlgeschlagene Flow-Events dokumentiert, davon ${criticalEvents ?? "–"} kritisch. Nutzer ohne gültige Rolle: ${missingRoles ?? "–"}. Das beschreibt den Messstand und noch keine Ursache.`, sourceLabels: ["Systemgesundheit", "Launch-Ops"] };
  }

  const athletes = number(nested(data.study, "summary"), "athletes_total") ?? number(data.overview, "total_athletes");
  const teams = number(data.overview, "total_teams") ?? data.teams?.length ?? null;
  const active7d = number(activation, "active_7d");
  return { ...common, intent: "overview", answer: `Jarvis sieht aktuell ${athletes ?? "–"} Athleten und ${teams ?? "–"} Teams. ${active7d ?? "–"} Athleten waren in den letzten 7 Tagen aktiv. Frage nach Aktivität, Trends, Teams, Verständnis, Messungen, Datenqualität, Feedback oder Systemzustand.`, sourceLabels: ["Admin-Übersicht", "Pilot-Auswertung", "Systemgesundheit"] };
};
