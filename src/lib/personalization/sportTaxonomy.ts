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

  if (category === "aesthetic_or_technical_sport") {
    return `Wenn deine Rolle heute "${role}" ist, übersetze den Fokus in Ausführung, Körperspannung, Rhythmus und den nächsten sauberen Versuch.`;
  }
  if (category === "combat_sport") {
    return `Wenn deine Rolle heute "${role}" ist, übersetze den Fokus in Distanz, Timing, Runde und die nächste klare Aktion.`;
  }
  if (category === "endurance_sport") {
    return `Wenn deine Rolle heute "${role}" ist, übersetze den Fokus in Rhythmus, Pace, Atmung und den nächsten Abschnitt.`;
  }
  if (category === "strength_power_sport") {
    return `Wenn deine Rolle heute "${role}" ist, übersetze den Fokus in Spannung, Setup, Explosivität und die nächste technische Wiederholung.`;
  }
  if (category === "precision_sport") {
    return `Wenn deine Rolle heute "${role}" ist, übersetze den Fokus in Routine, Zielbild, Ruhe und die nächste präzise Ausführung.`;
  }
  if (category === "net_or_target_sport") {
    return `Wenn deine Rolle heute "${role}" ist, übersetze den Fokus in Aufschlag, Return, Ballwechsel oder den nächsten Punkt.`;
  }
  if (category === "invasion_team_sport") {
    return `Wenn deine Rolle heute "${role}" ist, übersetze den Fokus in Raum, Entscheidung, Kommunikation und die nächste Aktion.`;
  }
  return null;
}
