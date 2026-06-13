import type { PersonalizationContextType, PersonalizationDay, SportCategory } from "./types";

export const sportContextLine: Record<SportCategory, Record<PersonalizationContextType, string>> = {
  invasion_team_sport: {
    training: "Für Teamsport wird das heute praktisch in Raum, Entscheidung, Kommunikation und der nächsten Aktion.",
    competition: "Im Wettkampf zählt die nächste Handlung: Raum sehen, Entscheidung treffen, Aktion sauber weiterspielen.",
    rest: "Am Ruhetag bleibt der Fokus mental: Muster sehen, ohne körperlich mehr Druck zu machen.",
  },
  net_or_target_sport: {
    training: "Für dein Spiel wird das heute praktisch in Aufschlag, Return, Ballwechsel, Timing oder dem nächsten Punkt.",
    competition: "Im Wettkampf zählt der nächste Punkt, nicht die Geschichte des letzten Ballwechsels.",
    rest: "Am Ruhetag bleibt der Fokus mental: Rhythmus, Klarheit und die nächste einfache Orientierung.",
  },
  combat_sport: {
    training: "Für Kampfsport wird das heute praktisch in Distanz, Timing, Treffer nehmen, Runde und nächster Aktion.",
    competition: "Im Kampf zählt die nächste klare Aktion: Distanz lesen, Spannung halten, nicht aus Engzug handeln.",
    rest: "Am Ruhetag bleibt der Fokus mental: Spannung regulieren, ohne den Körper zusätzlich zu belasten.",
  },
  aesthetic_or_technical_sport: {
    training: "Für technische Sportarten wird das heute praktisch in Versuch, Routine, Ausführung, Körperspannung und Präzision.",
    competition: "Im Wettkampf zählt die nächste Ausführung: Kür, Element, Landung, Wertung sehen und trotzdem bei der Aufgabe bleiben.",
    rest: "Am Ruhetag bleibt der Fokus mental: Routine im Kopf klären, ohne mehr körperliche Belastung aufzubauen.",
  },
  endurance_sport: {
    training: "Für Ausdauer wird das heute praktisch in Pace, Rhythmus, Atmung, Müdigkeit und dem nächsten Abschnitt.",
    competition: "Im Wettkampf zählt der nächste Abschnitt: Rhythmus halten, Enge bemerken, Schritt für Schritt weiterarbeiten.",
    rest: "Am Ruhetag bleibt der Fokus mental: Regeneration ernst nehmen, ohne daraus Schuld oder Zusatzdruck zu machen.",
  },
  strength_power_sport: {
    training: "Für Kraft und Power wird das heute praktisch in Setup, Spannung, Explosivität und der nächsten technischen Wiederholung.",
    competition: "Im Wettkampf zählt der nächste Versuch: Setup sauber, Spannung klar, Ausführung ohne Beweisdrang.",
    rest: "Am Ruhetag bleibt der Fokus mental: Spannung lösen, Qualität vorbereiten, nicht mehr Last erzeugen.",
  },
  precision_sport: {
    training: "Für Präzisionssport wird das heute praktisch in Routine, Zielbild, Ruhe und der nächsten sauberen Ausführung.",
    competition: "Im Wettkampf zählt die nächste Ausführung: Routine halten, Ergebnis sehen, aber nicht darin wohnen.",
    rest: "Am Ruhetag bleibt der Fokus mental: Ruhe, Klarheit und deine nächste stabile Routine.",
  },
  unknown_or_other: {
    training: "Übersetze es heute in deinen Sport: nächste Aufgabe, nächste Wiederholung, nächster Versuch, nächste saubere Handlung.",
    competition: "Im Wettkampf zählt nicht die perfekte innere Lage, sondern die nächste saubere Handlung.",
    rest: "Am Ruhetag bleibt der Fokus mental: erkennen, sortieren, ohne Zusatzdruck aufzubauen.",
  },
};

export function buildAddressLine(day: PersonalizationDay, contextType: PersonalizationContextType): string {
  const prefix = contextType === "competition" ? "Heute ist Wettkampftag." : contextType === "rest" ? "Heute ist Ruhetag." : "Heute ist Trainingstag.";
  return `${prefix} Im Fokus steht: ${day.lens}.`;
}

export function buildRelevanceLine(day: PersonalizationDay, contextType: PersonalizationContextType): string {
  if (day.phase === 1) {
    return "Heute geht es nicht um Perfektion, sondern darum, den entscheidenden Moment überhaupt zu bemerken.";
  }
  if (day.phase === 2) {
    return "Heute wird das Muster praktischer: aus Bemerken wird eine klare Gegenbewegung.";
  }
  if (day.phase === 3) {
    return contextType === "competition"
      ? "Heute wird der Mechanismus unter echter Bedeutung getestet: Ergebnis sehen, aber bei der nächsten Handlung bleiben."
      : "Heute wird der Mechanismus unter Druck getestet, ohne dass du mehr Drama daraus machen musst.";
  }
  return "Heute geht es um Verkörperung: weniger Technik sammeln, mehr aus deinem stabileren Standard handeln.";
}

export function buildStateLine(checkin?: { mood?: number | null; energy?: number | null; focus?: number | null; stress?: number | null }): string | null {
  if (!checkin) return null;
  const { mood, energy, focus, stress } = checkin;
  if (typeof stress === "number" && stress >= 7) return "Bei hoher Anspannung reicht heute ein klarer Anker. Kein Zusatzdruck, kein inneres Überladen.";
  if (typeof energy === "number" && energy <= 3) return "Bei niedriger Energie zählt heute eine kleinere, saubere Rückkehr mehr als maximaler Fokus.";
  if (typeof focus === "number" && focus <= 3) return "Wenn der Fokus schwankt, halte den Tag klein: ein Trigger, ein Cue, eine nächste Handlung.";
  if (typeof mood === "number" && mood <= 3) return "An schwereren Tagen zählt Qualität vor Menge: eine saubere Ausführung ist genug Material.";
  if (typeof energy === "number" && energy >= 8 && typeof focus === "number" && focus >= 7) return "Energie und Fokus sind stabil. Halte die Qualität sauber, ohne aus dem Tag ein Beweisprojekt zu machen.";
  return null;
}

export function buildProfileLine(signals?: { resultFocus?: number; selfCriticism?: number; judgementFear?: number; egoVisibility?: number; confidence?: number }): string | null {
  if (!signals) return null;
  const candidates: Array<{ score: number; text: string }> = [
    { score: signals.selfCriticism ?? 0, text: "Wenn Selbstkritik nach Fehlern hochschiebt, hilft heute die Trennung: Aktion sehen, Bewertung nicht übernehmen." },
    { score: signals.resultFocus ?? 0, text: "Wenn der Blick stark am Ergebnis hängt, hilft heute der Anker an der nächsten Prozesshandlung." },
    { score: signals.judgementFear ?? 0, text: "Wenn Bewertung von außen schwer wiegt, hilft heute Lernen statt Urteil: zurück zur Aufgabe, nicht zum Bild." },
    { score: signals.egoVisibility ?? 0, text: "Wenn Wirkung und Sichtbarkeit Druck machen, hilft heute Beitrag statt Effekt." },
  ];
  if (typeof signals.confidence === "number" && signals.confidence <= 0.3) {
    candidates.push({ score: 1 - signals.confidence, text: "Bei weniger Confidence zählen kleine Beweise im Verhalten, nicht ein perfektes Gefühl." });
  }
  const strongest = candidates.filter((item) => item.score >= 0.6).sort((a, b) => b.score - a.score)[0];
  return strongest?.text ?? null;
}

export function buildMicroCue(input: { contextType: PersonalizationContextType; phase: 1 | 2 | 3 | 4; stateLine: string | null; profileLine: string | null }): string {
  if (input.contextType === "competition") return "Nur die nächste.";
  if (input.stateLine?.includes("niedriger Energie")) return "Klein und sauber.";
  if (input.stateLine?.includes("hoher Anspannung")) return "Ein Anker reicht.";
  if (input.profileLine?.includes("Selbstkritik")) return "Aktion, nicht Urteil.";
  if (input.profileLine?.includes("Ergebnis")) return "Prozess zuerst.";
  if (input.phase === 1) return "Bemerken reicht.";
  if (input.phase === 4) return "Halten, was trägt.";
  return "Zurück zur Aufgabe.";
}
