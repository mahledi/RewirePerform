/**
 * Micro-Adjustment Layer.
 *
 * Pure, deterministische Funktion. Kein API-Call, kein KI-Call, kein DB-Call.
 * Erzeugt nur einen kleinen "Heute für dich"-Rahmen um den bestehenden Tag.
 *
 * WICHTIG:
 *   - Diese Funktion verändert NIE Tasks, Journal, Science Bite oder Comprehension.
 *   - Sie liefert nur kurze Sätze für die UI.
 *   - Fehlende Daten => sauberer Fallback (null oder neutraler Satz).
 *   - Keine Diagnose-Sprache, keine Therapiesprache, keine Motivationsfloskeln.
 */

export type SportKey =
  | "fußball"
  | "basketball"
  | "tennis"
  | "leichtathletik"
  | "unknown";

export type FootballPosition = "iv" | "stürmer" | "mittelfeld" | "torwart";
export type BasketballPosition = "guard" | "forward" | "center";

export type JournalSignal =
  | "self_doubt"
  | "pressure_after_mistake"
  | "fear_of_judgement"
  | "low_energy"
  | "result_focus"
  | "comparison"
  | "avoidance"
  | "frustration_uncontrollable";

export interface MicroAdjustmentDay {
  dayNumber: number;
  lens: string;
  primaryMechanism: string;
  recurrenceType: string;
  phase: 1 | 2 | 3 | 4;
}

export interface MicroAdjustmentInput {
  day: MicroAdjustmentDay;
  contextType: "training" | "rest" | "competition";
  profile?: {
    sport?: string | null;
    position?: string | null;
    fullName?: string | null;
  };
  questionnaireSignals?: {
    resultFocus?: number;
    selfCriticism?: number;
    judgementFear?: number;
    egoVisibility?: number;
    confidence?: number;
  };
  checkin?: {
    mood?: number | null;
    energy?: number | null;
    focus?: number | null;
    stress?: number | null;
  };
  recentJournalSignals?: JournalSignal[];
}

export interface MicroAdjustmentOutput {
  athleteAddressLine: string;
  sportExample: string;
  positionExample: string | null;
  stateEmphasis: string | null;
  profileEmphasis: string | null;
  journalPatternEmphasis: string | null;
  microCue: string;
}

// ─── Sport / Position Normalisierung ──────────────────────

const normalizeSport = (sport?: string | null): SportKey => {
  if (!sport) return "unknown";
  const s = sport.toLowerCase().trim();
  if (s.includes("fuß") || s.includes("fuss") || s.includes("soccer") || s.includes("football")) return "fußball";
  if (s.includes("basket")) return "basketball";
  if (s.includes("tennis")) return "tennis";
  if (s.includes("leicht") || s.includes("athlet") || s.includes("track")) return "leichtathletik";
  return "unknown";
};

const normalizeFootballPosition = (pos?: string | null): FootballPosition | null => {
  if (!pos) return null;
  const p = pos.toLowerCase().trim();
  if (p.includes("innen") || p === "iv" || p.includes("verteid")) return "iv";
  if (p.includes("stürm") || p.includes("sturm") || p.includes("stuerm") || p.includes("striker") || p.includes("forward") || p.includes("angreif")) return "stürmer";
  if (p.includes("mittel") || p.includes("midfield") || p === "zm" || p === "om" || p === "dm") return "mittelfeld";
  if (p.includes("tor") || p.includes("keeper") || p.includes("goalie")) return "torwart";
  return null;
};

const normalizeBasketballPosition = (pos?: string | null): BasketballPosition | null => {
  if (!pos) return null;
  const p = pos.toLowerCase().trim();
  if (p.includes("guard")) return "guard";
  if (p.includes("forward")) return "forward";
  if (p.includes("center")) return "center";
  return null;
};

// ─── Sport Examples ───────────────────────────────────────

const pickSportExample = (sport: SportKey, contextType: MicroAdjustmentInput["contextType"]): string => {
  if (contextType === "competition") {
    switch (sport) {
      case "fußball": return "Im Spiel zählt nicht der perfekte Moment, sondern die saubere nächste Aktion.";
      case "basketball": return "Im Spiel zählt der nächste Possession-Moment, nicht der letzte Wurf.";
      case "tennis": return "Im Match zählt der nächste Punkt, nicht der vergangene.";
      case "leichtathletik": return "Im Wettkampf zählt der nächste Versuch, nicht der vorherige.";
      default: return "Im Wettkampf zählt die nächste Handlung, nicht die letzte.";
    }
  }
  if (contextType === "rest") {
    return "Heute geht es um die mentale Vorbereitung, nicht um körperliche Belastung.";
  }
  switch (sport) {
    case "fußball": return "Übertrage es auf einen typischen Trainingsmoment im Spielaufbau oder Zweikampf.";
    case "basketball": return "Übertrage es auf einen typischen Moment im Drill oder im Scrimmage.";
    case "tennis": return "Übertrage es auf einen typischen Moment im Ballwechsel oder im Aufschlagspiel.";
    case "leichtathletik": return "Übertrage es auf einen typischen Moment im Lauf, Sprung oder Wurf.";
    default: return "Such dir einen Moment im Training, der dazu passt.";
  }
};

const pickPositionExample = (
  sport: SportKey,
  position: string | null | undefined,
  _mechanism: string,
): string | null => {
  if (sport === "fußball") {
    const pos = normalizeFootballPosition(position);
    switch (pos) {
      case "iv": return "Als Innenverteidiger zählt besonders der Moment nach einem Fehler oder unklarer Kommunikation — er ist sichtbar und hat direkte Folgen.";
      case "stürmer": return "Als Stürmer zählt besonders der Moment nach einer verpassten Chance — Erwartung und Sichtbarkeit sind hoch.";
      case "mittelfeld": return "Im Mittelfeld zählt besonders der Moment, in dem du scannen, entscheiden und verbinden musst — auch wenn der Rhythmus bricht.";
      case "torwart": return "Als Torwart zählt besonders der Moment nach einem Gegentor — Isolation und Reaktion entscheiden den nächsten Ball.";
      default: return null;
    }
  }
  if (sport === "basketball") {
    const pos = normalizeBasketballPosition(position);
    switch (pos) {
      case "guard": return "Als Guard zählt besonders der Moment nach einem Turnover oder Fehlpass — du steuerst den nächsten Possession.";
      case "forward": return "Als Forward zählt besonders der Moment im Mismatch oder Rebound — Präsenz vor Perfektion.";
      case "center": return "Als Center zählt besonders der Moment im Post oder unter dem Korb — Raum vor Aktion.";
      default: return null;
    }
  }
  return null;
};

// ─── State Emphasis (aktueller Check-in) ──────────────────

const pickStateEmphasis = (checkin?: MicroAdjustmentInput["checkin"]): string | null => {
  if (!checkin) return null;
  const { mood, energy, focus, stress } = checkin;
  // Reihenfolge: stärkstes Signal zuerst
  if (typeof stress === "number" && stress >= 7) {
    return "Du bist gerade mit erhöhter Anspannung unterwegs — heute reicht ein klarer Prozessanker, kein Zusatzdruck.";
  }
  if (typeof energy === "number" && energy <= 3) {
    return "Bei niedriger Energie zählt eine kleinere, sauberere Rückkehrhandlung mehr als maximaler Fokus.";
  }
  if (typeof focus === "number" && focus <= 3) {
    return "Wenn der Fokus heute schwankt, reicht ein konkreter Trigger und ein einziger Cue.";
  }
  if (typeof mood === "number" && mood <= 3) {
    return "An ruhigeren Tagen reicht eine saubere Ausführung — Qualität vor Menge.";
  }
  if (typeof energy === "number" && energy >= 8 && typeof focus === "number" && focus >= 7) {
    return "Energie und Fokus sind heute stabil — halte die Qualität sauber, ohne zu überladen.";
  }
  return null;
};

// ─── Profile Emphasis (Fragebogensignale) ─────────────────

const pickProfileEmphasis = (
  signals?: MicroAdjustmentInput["questionnaireSignals"],
): string | null => {
  if (!signals) return null;
  const entries: Array<[keyof NonNullable<typeof signals>, number, string]> = [
    ["selfCriticism", signals.selfCriticism ?? 0, "Wenn Selbstkritik nach Fehlern hochschiebt, hilft heute eine klare Trennung zwischen Aktion und Bewertung."],
    ["resultFocus", signals.resultFocus ?? 0, "Wenn der Blick stark am Ergebnis hängt, hilft heute der Anker an der nächsten Prozesshandlung."],
    ["judgementFear", signals.judgementFear ?? 0, "Wenn die Sicht von außen schwer wiegt, hilft heute der Fokus auf Lernen statt Urteil."],
    ["egoVisibility", signals.egoVisibility ?? 0, "Wenn Wirkung und Sichtbarkeit Druck erzeugen, hilft heute der Fokus auf Beitrag statt Effekt."],
  ];
  // Niedrige Confidence als eigenes Signal (invers): nur wenn deutlich niedrig.
  if (typeof signals.confidence === "number" && signals.confidence <= 0.3) {
    entries.push(["confidence", 1 - signals.confidence, "Bei aktuell geringerer Confidence zählen kleine Beweise und Handlung vor Gefühl."]);
  }
  const strongest = entries
    .filter(([, v]) => v >= 0.6)
    .sort((a, b) => b[1] - a[1])[0];
  return strongest ? strongest[2] : null;
};

// ─── Journal Pattern Emphasis ─────────────────────────────

const journalSignalLabel: Record<JournalSignal, string> = {
  self_doubt: "Selbstzweifel",
  pressure_after_mistake: "Druck nach Fehlern",
  fear_of_judgement: "Sorge vor fremder Bewertung",
  low_energy: "wenig Energie",
  result_focus: "starker Ergebnisbezug",
  comparison: "Vergleich mit anderen",
  avoidance: "Vermeidung schwieriger Szenen",
  frustration_uncontrollable: "Frustration über Unkontrollierbares",
};

const pickJournalEmphasis = (signals?: JournalSignal[]): string | null => {
  if (!signals || signals.length === 0) return null;
  // Häufigstes Muster nehmen.
  const counts = new Map<JournalSignal, number>();
  for (const s of signals) counts.set(s, (counts.get(s) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (!top || top[1] < 2) return null; // erst ab 2 Vorkommen
  return `In deinen letzten Reflexionen tauchte häufiger ${journalSignalLabel[top[0]]} auf — heute reicht es, das einmal sauber im Tagesfokus zu halten.`;
};

// ─── Micro Cue ─────────────────────────────────────────────

const pickMicroCue = (input: MicroAdjustmentInput): string => {
  const { checkin, recentJournalSignals, contextType } = input;
  if (recentJournalSignals?.includes("pressure_after_mistake")) return "Fehler, nicht Ich.";
  if (recentJournalSignals?.includes("result_focus") || contextType === "competition") return "Nur die nächste.";
  if (typeof checkin?.energy === "number" && checkin.energy <= 3) return "Direkt zurück.";
  if (typeof checkin?.stress === "number" && checkin.stress >= 7) return "Ein Anker reicht.";
  if (recentJournalSignals?.includes("self_doubt")) return "Handlung vor Gefühl.";
  if (recentJournalSignals?.includes("comparison")) return "Eigener Maßstab.";
  if (input.day.phase === 1) return "Eine saubere Wiederholung.";
  if (input.day.phase === 4) return "Halten, was trägt.";
  return "Handlung vor Selbstbewertung.";
};

// ─── Address Line ─────────────────────────────────────────

const pickAddressLine = (input: MicroAdjustmentInput): string => {
  const { day, contextType } = input;
  const ctx = contextType === "competition"
    ? "Heute ist Wettkampftag — "
    : contextType === "rest"
      ? "Heute ist Ruhetag — "
      : "";
  return `${ctx}im Fokus steht: ${day.lens}.`;
};

// ─── Public API ───────────────────────────────────────────

export const buildMicroAdjustmentContext = (
  input: MicroAdjustmentInput,
): MicroAdjustmentOutput => {
  const sport = normalizeSport(input.profile?.sport);
  return {
    athleteAddressLine: pickAddressLine(input),
    sportExample: pickSportExample(sport, input.contextType),
    positionExample: pickPositionExample(sport, input.profile?.position, input.day.primaryMechanism),
    stateEmphasis: pickStateEmphasis(input.checkin),
    profileEmphasis: pickProfileEmphasis(input.questionnaireSignals),
    journalPatternEmphasis: pickJournalEmphasis(input.recentJournalSignals),
    microCue: pickMicroCue(input),
  };
};

// ─── Lightweight Journal Pattern Extraction ───────────────
// Keyword-basiert, keine KI, kein Persistieren. Nur sehr sichere Marker.

const KEYWORD_MAP: Array<{ signal: JournalSignal; keywords: RegExp }> = [
  { signal: "pressure_after_mistake", keywords: /\b(fehler|patzer|verloren|verschuldet|verbockt)\b/i },
  { signal: "self_doubt", keywords: /\b(zweifel|unsicher|nicht gut genug|ich kann das nicht|kann das eh nicht)\b/i },
  { signal: "fear_of_judgement", keywords: /\b(coach (sieht|denkt)|trainer (sieht|denkt)|was denken|peinlich|blamier)\b/i },
  { signal: "low_energy", keywords: /\b(müde|erschöpft|kraftlos|kaputt|platt|keine energie)\b/i },
  { signal: "result_focus", keywords: /\b(ergebnis|gewinnen|verlieren|tabelle|punkte|score)\b/i },
  { signal: "comparison", keywords: /\b(vergleich|besser als|schlechter als|der andere|die anderen sind)\b/i },
  { signal: "avoidance", keywords: /\b(vermeid|ausgewichen|nicht angegangen|umgangen|nicht gestellt)\b/i },
  { signal: "frustration_uncontrollable", keywords: /\b(schiri|wetter|unfair|pech|zufall|außerhalb meiner kontrolle)\b/i },
];

export const extractJournalSignals = (texts: Array<string | null | undefined>): JournalSignal[] => {
  const out: JournalSignal[] = [];
  for (const raw of texts) {
    if (!raw) continue;
    for (const { signal, keywords } of KEYWORD_MAP) {
      if (keywords.test(raw)) out.push(signal);
    }
  }
  return out;
};
