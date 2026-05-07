/**
 * Merge rewritten comprehension pools into src/content/dailyContent.ts.
 * Replaces option.text and explanation in COMPREHENSION_POOLS via id matching.
 */
import { readFileSync, writeFileSync } from "fs";

const SRC = "src/content/dailyContent.ts";
const REWRITTEN = "scripts/.comprehension-rewritten.json";

const data: Record<string, Array<{
  id: string;
  options: { id: string; text: string }[];
  explanation: string;
}>> = JSON.parse(readFileSync(REWRITTEN, "utf-8"));

let src = readFileSync(SRC, "utf-8");

// Build map: questionId -> {options:{a:text...}, explanation}
const byQ = new Map<string, { options: Record<string, string>; explanation: string }>();
for (const day of Object.values(data)) {
  for (const q of day) {
    const opts: Record<string, string> = {};
    for (const o of q.options) opts[o.id] = o.text;
    byQ.set(q.id, { options: opts, explanation: q.explanation });
  }
}

const escape = (s: string) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

// For each question block, find by `id: "xyz"` and rewrite its options[] + explanation.
let count = 0;
const blockRe = /\{\s*id:\s*"([^"]+)",\s*target:\s*"[^"]+",\s*stem:\s*"[^"]*",\s*options:\s*\[([\s\S]*?)\],\s*correctOptionId:\s*"[^"]+",\s*explanation:\s*"([^"]*)",?\s*\}/g;

src = src.replace(blockRe, (full, id, optsBlock, _expl) => {
  const rew = byQ.get(id);
  if (!rew) return full;
  const newOpts = optsBlock.replace(/\{\s*id:\s*"([abcd])",\s*text:\s*"([^"]*)"\s*\},?/g, (m: string, oid: string) => {
    const t = rew.options[oid];
    if (!t) return m;
    return `{ id: "${oid}", text: "${escape(t)}" },`;
  });
  count++;
  return full
    .replace(optsBlock, newOpts)
    .replace(/explanation:\s*"[^"]*"/, `explanation: "${escape(rew.explanation)}"`);
});

writeFileSync(SRC, src);
console.log(`Merged ${count} questions across ${Object.keys(data).length} days`);
