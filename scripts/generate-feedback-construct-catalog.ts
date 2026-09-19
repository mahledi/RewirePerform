import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { FEEDBACK_CONSTRUCT_CATALOG_V03 } from "../src/content/feedbackIntelligenceSemanticsV03";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(root, "docs/feedback-intelligence/contracts/v0.3/construct-catalog.json");
const serialized = `${JSON.stringify(FEEDBACK_CONSTRUCT_CATALOG_V03, null, 2)}\n`;

if (process.argv.includes("--check")) {
  if (!existsSync(output) || readFileSync(output, "utf8") !== serialized) {
    console.error("Feedback construct catalog is stale. Run npm run feedback:catalog:build.");
    process.exitCode = 1;
  } else {
    console.log(`Verified ${output}`);
  }
} else {
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, serialized, "utf8");
console.log(`Wrote ${output}`);
}
