import type { SportCategory, SportContext } from "./types";

const SPORT_PATTERNS: Array<{ category: SportCategory; label: string; patterns: RegExp[]; team?: boolean }> = [
  {
    category: "invasion_team_sport",
    label: "Teamsport",
    team: true,
    patterns: [/fußball|fussball|soccer|football/i, /basketball/i, /handball/i, /hockey/i, /rugby/i, /american football/i, /lacrosse/i],
  },
  {
    category: "net_or_target_sport",
    label: "Netz-/Zielspiel",
    patterns: [/tennis/i, /badminton/i, /volleyball/i, /tischtennis|table tennis/i, /padel/i, /squash/i],
  },
  {
    category: "combat_sport",
    label: "Kampfsport",
    patterns: [/box|boxing/i, /mma|mixed martial/i, /judo/i, /ringen|wrestling/i, /karate/i, /taekwondo/i, /kickbox/i, /muay thai/i, /bjj|jiu/i],
  },
  {
    category: "aesthetic_or_technical_sport",
    label: "technische Sportart",
    patterns: [/turn|gymnast/i, /gymnastik/i, /eiskunst|figure skat/i, /tanz|dance/i, /cheer/i, /akrobat/i, /trampolin/i],
  },
  {
    category: "endurance_sport",
    label: "Ausdauersport",
    patterns: [/lauf|running|marathon/i, /schwimm|swim/i, /rad|cycling|bike/i, /triathlon/i, /rudern|rowing/i, /langlauf/i],
  },
  {
    category: "strength_power_sport",
    label: "Kraft-/Schnelligkeitssport",
    patterns: [/gewichtheben|weightlifting/i, /powerlifting/i, /sprint/i, /wurf|throw/i, /sprung|jump/i, /crossfit/i],
  },
  {
    category: "precision_sport",
    label: "Präzisionssport",
    patterns: [/golf/i, /bogen|archery/i, /schieß|shooting/i, /dart/i, /billard|snooker/i],
  },
];

export function resolveSportContext(sport?: string | null): SportContext {
  const raw = sport?.trim();
  if (!raw) {
    return { category: "unknown_or_other", label: "deinem Sport", isTeamOrGroupContext: false };
  }

  const match = SPORT_PATTERNS.find((entry) => entry.patterns.some((pattern) => pattern.test(raw)));
  if (!match) {
    return { category: "unknown_or_other", label: "deinem Sport", isTeamOrGroupContext: false };
  }

  return {
    category: match.category,
    label: match.label,
    isTeamOrGroupContext: Boolean(match.team),
  };
}

export function buildRoleContextLine(category: SportCategory, position?: string | null): string | null {
  const role = position?.trim();
  if (!role || role.length < 2) return null;
  const normalized = role.toLowerCase();

  if (category === "aesthetic_or_technical_sport") {
    if (/boden|floor/i.test(normalized)) {
      return `Für ${role} heißt das heute: Rhythmus halten, Körperspannung früh setzen und nach jedem Element zum nächsten sauberen Versuch zurückkehren.`;
    }
    if (/barren|reck|beam|balken|sprung|vault|ringe/i.test(normalized)) {
      return `Für ${role} zählt heute die nächste Ausführung: Setup, Spannung, Linie und Landung klarer lesen als die Wertung.`;
    }
    return `Für ${role} heißt das heute: Ausführung, Körperspannung, Rhythmus und der nächste saubere Versuch stehen vor Wirkung oder Wertung.`;
  }
  if (category === "combat_sport") {
    return `Für ${role} übersetzt du den Fokus heute in Distanz, Timing, Deckung und die nächste klare Aktion statt in eine Reaktion aus Enge.`;
  }
  if (category === "endurance_sport") {
    return `Für ${role} wird der Fokus heute konkret: Rhythmus finden, Pace lesen, Atmung stabilisieren und nur den nächsten Abschnitt laufen lassen.`;
  }
  if (category === "strength_power_sport") {
    return `Für ${role} zählt heute dein Setup: Spannung aufbauen, Explosivität sauber abrufen und die nächste Wiederholung technisch halten.`;
  }
  if (category === "precision_sport") {
    return `Für ${role} übersetzt du den Fokus heute in Routine, Zielbild, Ruhe und eine präzise Ausführung statt in Ergebnisdruck.`;
  }
  if (category === "net_or_target_sport") {
    return `Für ${role} bleibt es heute klein: Aufschlag, Return, Ballwechsel oder der nächste Punkt statt die Geschichte des letzten Fehlers.`;
  }
  if (category === "invasion_team_sport") {
    if (/torwart|keeper|goal/i.test(normalized)) {
      return `Für ${role} heißt das heute: Position klären, Kommunikation früh setzen und nach jeder Aktion sofort wieder Spielinformation lesen.`;
    }
    if (/quarterback|point guard|aufbau|spielmacher/i.test(normalized)) {
      return `Für ${role} heißt das heute: Übersicht behalten, Tempo steuern, nächste Entscheidung treffen und nicht am letzten Play hängen.`;
    }
    if (/innenverteid|verteid|defen|corner|safety|linebacker/i.test(normalized)) {
      return `Für ${role} heißt das heute: Raum sichern, Körperstellung prüfen, Kommunikation halten und nach Fehlern sofort wieder Ordnung geben.`;
    }
    if (/mittel|midfield|wing|flügel/i.test(normalized)) {
      return `Für ${role} heißt das heute: Anschlussaktion sehen, Raum öffnen, Kommunikation nutzen und die nächste Entscheidung spielbar machen.`;
    }
    if (/stürmer|striker|forward|receiver|running back/i.test(normalized)) {
      return `Für ${role} heißt das heute: Timing, Tiefe, Abschluss oder Laufweg sauber halten, ohne jeden Moment zum Beweis zu machen.`;
    }
    return `Für ${role} übersetzt du den Fokus heute in Raum, Entscheidung, Kommunikation und eine nächste Aktion, die dem Spiel hilft.`;
  }
  return null;
}
