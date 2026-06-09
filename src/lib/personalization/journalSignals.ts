import type { JournalSignal } from "./types";

const KEYWORD_MAP: Array<{ signal: JournalSignal; keywords: RegExp }> = [
  { signal: "pressure_after_mistake", keywords: /\b(fehler|patzer|verloren|verschuldet|verbockt|verkackt|daneben)\b/i },
  { signal: "self_doubt", keywords: /\b(zweifel|unsicher|nicht gut genug|ich kann das nicht|kann das eh nicht|wertlos)\b/i },
  { signal: "fear_of_judgement", keywords: /\b(coach (sieht|denkt)|trainer (sieht|denkt)|was denken|peinlich|blamier|bewertet|wertung|kampfrichter)\b/i },
  { signal: "low_energy", keywords: /\b(müde|erschöpft|kraftlos|kaputt|platt|keine energie|leer)\b/i },
  { signal: "result_focus", keywords: /\b(ergebnis|gewinnen|verlieren|tabelle|punkte|score|wertung|note|platzierung)\b/i },
  { signal: "comparison", keywords: /\b(vergleich|besser als|schlechter als|der andere|die anderen sind|konkurrenz)\b/i },
  { signal: "avoidance", keywords: /\b(vermeid|ausgewichen|nicht angegangen|umgangen|nicht gestellt|zurückgezogen)\b/i },
  { signal: "frustration_uncontrollable", keywords: /\b(schiri|wetter|unfair|pech|zufall|außerhalb meiner kontrolle|kampfrichter|wertung)\b/i },
];

export function extractJournalSignals(texts: Array<string | null | undefined>): JournalSignal[] {
  const out: JournalSignal[] = [];
  for (const raw of texts) {
    if (!raw) continue;
    for (const { signal, keywords } of KEYWORD_MAP) {
      if (keywords.test(raw)) out.push(signal);
    }
  }
  return out;
}
