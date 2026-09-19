#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { executeSimpleQuery, parseCredentialInput, readPinnedSupabaseCa, sanitizePostgresError } from "./execute-postgres-simple-query.mjs";

const value = (name) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const expected = { host: "aws-1-eu-central-1.pooler.supabase.com", port: 5432, user: "postgres.bqsbxesmybthwtxmowfz", database: "postgres" };

try {
  const target = { host: value("--host"), port: Number(value("--port")), user: value("--user"), database: value("--database") };
  const file = value("--file");
  const caFile = value("--ca-file");
  const operation = value("--operation");
  if (JSON.stringify(target) !== JSON.stringify(expected) || !file || !caFile
      || !["activation-smoke", "activation-postrollback-audit"].includes(operation)) {
    throw new Error("ACTIVATION_SMOKE_TARGET_DRIFT");
  }
  const rows = await executeSimpleQuery({ target, password: parseCredentialInput(readFileSync(0, "utf8")),
    sql: readFileSync(resolve(file), "utf8"), ca: readPinnedSupabaseCa(caFile), operation });
  process.stdout.write(`${JSON.stringify(rows)}\n`);
} catch (error) {
  process.stderr.write(`${JSON.stringify(sanitizePostgresError(error))}\n`);
  process.exitCode = 1;
}
