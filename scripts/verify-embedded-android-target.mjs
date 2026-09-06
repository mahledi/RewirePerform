import { readFile, readdir } from "node:fs/promises";
import { extname, resolve } from "node:path";

const PRODUCTION_REF = "bqsbxesmybthwtxmowfz";
const FORBIDDEN_REFS = [
  "zbeswjipayspgvcipzmx",
  "towgvykgezrmkbyudjen",
  "twceqincrbrenyuqukpj",
];
const textExtensions = new Set([".html", ".js", ".json", ".mjs", ".txt"]);

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
}

const root = resolve(
  process.cwd(),
  argumentValue("--root") ?? "android/app/src/main/assets/public",
);

async function collectTextFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectTextFiles(path)));
    } else if (textExtensions.has(extname(entry.name))) {
      files.push(path);
    }
  }
  return files;
}

try {
  const files = await collectTextFiles(root);
  let productionMatches = 0;
  const forbiddenMatches = new Set();

  for (const file of files) {
    const content = await readFile(file, "utf8");
    productionMatches += content.split(PRODUCTION_REF).length - 1;
    for (const projectRef of FORBIDDEN_REFS) {
      if (content.includes(projectRef)) forbiddenMatches.add(projectRef);
    }
  }

  if (forbiddenMatches.size > 0) {
    throw new Error(
      `Android embedded assets contain forbidden non-Production refs: ${[
        ...forbiddenMatches,
      ].join(", ")}`,
    );
  }
  if (productionMatches === 0) {
    throw new Error(
      `Android embedded assets do not contain Production ref ${PRODUCTION_REF}`,
    );
  }

  console.log(
    `Android embedded target validation passed: Production ${PRODUCTION_REF}`,
  );
} catch (error) {
  console.error(
    error instanceof Error
      ? error.message
      : "Android embedded target validation failed",
  );
  process.exit(1);
}
