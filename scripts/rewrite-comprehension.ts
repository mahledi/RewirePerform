/**
 * Rewrite COMPREHENSION_POOLS to make distractors equally plausible
 * and similar in length. Preserves id, target, stem, correctOptionId.
 *
 * Run: bun scripts/rewrite-comprehension.ts
 */
import { writeFileSync, readFileSync, existsSync } from "fs";
import { DAILY_CONTENT } from "../src/content/dailyContent";
import { getMatrixDay } from "../src/content/matrixDays";
import type { ComprehensionQuestion, DailyContent } from "../src/content/matrixDayTypes";

const API_KEY = process.env.LOVABLE_API_KEY;
if (!API_KEY) throw new Error("LOVABLE_API_KEY missing");

const MODEL = "google/gemini-2.5-pro";
const OUT_PATH = "scripts/.comprehension-rewritten.json";
const LOG_PATH = "scripts/.comprehension-log.txt";

const SYSTEM = `Du überarbeitest Multiple-Choice-Verständnisfragen für ein neurokognitives Mental-Trainings-Programm für Athleten 14-18 Jahre.

ZIEL: Die richtige Antwort darf NICHT mehr durch ihre Länge oder offensichtliche Plausibilität erkennbar sein. Spieler müssen die TAGES-KERNAUSSAGE wirklich verstanden haben, um zu antworten.

REGELN — strikt einhalten:
1) Alle 4 Optionen ungefähr GLEICH LANG (max ±15% Zeichen vom Median, alle ein einzelner Satz, ähnlicher Satzbau).
2) Alle 4 Optionen sind PLAUSIBEL für jemanden, der den Tag nur halb verstanden hat.
3) Genau EINE Option ist eindeutig richtig basierend auf dem Tagesinhalt (Lens, Mechanismus, Tasks).
4) Distraktoren = häufige Missverständnisse: Leistungs-Framing ("härter pushen"), Selbstoptimierung, Selbstbestrafung, Vermeidung, Analyse-Schleifen, Härte-Maskerade. KEIN offensichtlicher Unsinn.
5) Sprache: konkret, jugendgerecht, kein Coaching-Sprech, keine Floskeln. Kein "einfach", kein "wirklich".
6) Erklärung: 1 Satz. Sagt warum die richtige Option richtig ist UND was das Missverständnis der häufigsten falschen Wahl ist.
7) BEHALTE: id, target, stem, correctOptionId und die Optionen-IDs (a/b/c/d). Ändere NUR option.text und explanation.

Du bekommst pro Frage: den Tageskontext (Lens, Mechanismus, Kern-Shift, Tasks) und die alte Frage. Gib für jede Frage die überarbeitete Version zurück.`;

function buildDayContext(dayNumber: number): string {
  const matrix = getMatrixDay(dayNumber);
  const content = DAILY_CONTENT[dayNumber];
  if (!matrix || !content) return "";
  return `TAG ${dayNumber} — ${matrix.lens}
Phase ${matrix.phase} | Woche ${matrix.week} | Mechanismus: ${matrix.primaryMechanism}
Practice Focus: ${matrix.practiceFocus}
Today Trigger: ${content.todayTrigger}
Core Shift: ${content.coreShift}
Tasks:
${content.tasks.map((t, i) => `  ${i + 1}. ${t.title} — ${t.concreteAction || t.why}`).join("\n")}`;
}

const TOOL = {
  type: "function",
  function: {
    name: "rewrite_pool",
    description: "Gibt überarbeitete Verständnisfragen zurück.",
    parameters: {
      type: "object",
      properties: {
        questions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              options: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    text: { type: "string" },
                  },
                  required: ["id", "text"],
                  additionalProperties: false,
                },
              },
              explanation: { type: "string" },
            },
            required: ["id", "options", "explanation"],
            additionalProperties: false,
          },
        },
      },
      required: ["questions"],
      additionalProperties: false,
    },
  },
} as const;

interface Rewritten {
  id: string;
  options: { id: string; text: string }[];
  explanation: string;
}

function extractJson(text: string): any | null {
  try {
    return JSON.parse(text);
  } catch {}
  const m = text.match(/\{[\s\S]*\}/);
  if (m) {
    try {
      return JSON.parse(m[0]);
    } catch {}
  }
  return null;
}

async function rewriteDay(dayNumber: number, pool: ComprehensionQuestion[]): Promise<Rewritten[] | null> {
  const ctx = buildDayContext(dayNumber);
  const userPayload = {
    day_context: ctx,
    questions: pool.map((q) => ({
      id: q.id,
      target: q.target,
      stem: q.stem,
      correctOptionId: q.correctOptionId,
      options: q.options.map((o) => ({ id: o.id, text: o.text })),
      currentExplanation: q.explanation,
    })),
  };

  const body = {
    model: MODEL,
    messages: [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content:
          "Überarbeite jede Frage gemäß den Regeln. Behalte id, stem, correctOptionId, Options-IDs.\n\n" +
          JSON.stringify(userPayload, null, 2),
      },
    ],
    tools: [TOOL],
    tool_choice: { type: "function", function: { name: "rewrite_pool" } },
  };

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (res.status === 429) {
        console.warn(`[Day ${dayNumber}] 429, warte...`);
        await new Promise((r) => setTimeout(r, 8000 * attempt));
        continue;
      }
      if (!res.ok) {
        console.error(`[Day ${dayNumber}] HTTP ${res.status}: ${await res.text()}`);
        return null;
      }
      const json = await res.json();
      const choice = json.choices?.[0];
      const toolCall = choice?.message?.tool_calls?.[0];
      let parsed: any = null;
      if (toolCall?.function?.arguments) {
        parsed = extractJson(toolCall.function.arguments);
      }
      if (!parsed && choice?.message?.content) {
        parsed = extractJson(choice.message.content);
      }
      if (!parsed?.questions) {
        console.error(`[Day ${dayNumber}] kein parsebares Ergebnis`);
        return null;
      }
      return parsed.questions as Rewritten[];
    } catch (e) {
      console.error(`[Day ${dayNumber}] attempt ${attempt} error:`, e);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  return null;
}

function validate(orig: ComprehensionQuestion[], rew: Rewritten[]): string | null {
  if (rew.length !== orig.length) return `Länge mismatch ${rew.length}/${orig.length}`;
  const byId = new Map(rew.map((r) => [r.id, r]));
  for (const q of orig) {
    const r = byId.get(q.id);
    if (!r) return `id ${q.id} fehlt`;
    if (r.options.length !== q.options.length) return `${q.id}: optionen ${r.options.length}/${q.options.length}`;
    const ids = new Set(r.options.map((o) => o.id));
    for (const o of q.options) if (!ids.has(o.id)) return `${q.id}: option ${o.id} fehlt`;
    for (const o of r.options) if (!o.text || o.text.length < 8) return `${q.id}: leerer text`;
    if (!r.explanation || r.explanation.length < 15) return `${q.id}: leere explanation`;
    // Length sanity: max/min ratio <= 2.2
    const lens = r.options.map((o) => o.text.length);
    const ratio = Math.max(...lens) / Math.min(...lens);
    if (ratio > 2.2) return `${q.id}: längen-ratio ${ratio.toFixed(2)} (texte: ${lens.join(",")})`;
  }
  return null;
}

async function main() {
  const days = Object.keys(DAILY_CONTENT)
    .map(Number)
    .sort((a, b) => a - b)
    .filter((d) => (DAILY_CONTENT[d].comprehensionPool ?? []).length > 0);

  // Resume support
  let results: Record<number, ComprehensionQuestion[]> = {};
  if (existsSync(OUT_PATH)) {
    results = JSON.parse(readFileSync(OUT_PATH, "utf-8"));
    console.log(`Resume: ${Object.keys(results).length} Tage bereits gemacht`);
  }
  const log: string[] = [];

  for (const day of days) {
    if (results[day]) continue;
    const pool = DAILY_CONTENT[day].comprehensionPool!;
    process.stdout.write(`Tag ${day} (${pool.length}q)... `);
    const rew = await rewriteDay(day, pool);
    if (!rew) {
      log.push(`Tag ${day}: AI failed → behalte alt`);
      results[day] = pool;
      console.log("FAIL");
      writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
      continue;
    }
    const err = validate(pool, rew);
    if (err) {
      log.push(`Tag ${day}: validation ${err} → behalte alt`);
      results[day] = pool;
      console.log(`INVALID (${err})`);
      writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
      continue;
    }
    // Merge: keep target/stem/correctOptionId, swap option texts + explanation
    const merged: ComprehensionQuestion[] = pool.map((q) => {
      const r = rew.find((x) => x.id === q.id)!;
      const newOptionsById = new Map(r.options.map((o) => [o.id, o.text]));
      return {
        ...q,
        options: q.options.map((o) => ({ id: o.id, text: newOptionsById.get(o.id) ?? o.text })),
        explanation: r.explanation,
      };
    });
    results[day] = merged;
    console.log("OK");
    writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
    await new Promise((r) => setTimeout(r, 1200));
  }
  writeFileSync(LOG_PATH, log.join("\n"));
  console.log(`\nFertig. ${Object.keys(results).length} Tage. Log: ${LOG_PATH}`);
}

main();
