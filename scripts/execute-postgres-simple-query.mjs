#!/usr/bin/env node

import { X509Certificate } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "../tools/production-rollback-dry-run/node_modules/pg/lib/index.js";

const { Client } = pg;
const expected = {
  host: "aws-1-eu-central-1.pooler.supabase.com",
  port: 5432,
  user: "postgres.bqsbxesmybthwtxmowfz",
  database: "postgres",
};
const expectedCaFingerprint256 = "80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA";
const safeDryRunMarkers = [
  "v1_1_dry_run_feedback_schema_must_be_absent",
  "v1_1_dry_run_forbidden_callable_inventory",
  "v1_1_dry_run_machine_gates_not_closed",
  "v1_1_dry_run_private_function_inventory_drift",
  "v1_1_dry_run_private_schema_owner_drift",
  "v1_1_dry_run_production_reader_membership_drift",
  "v1_1_dry_run_production_reader_not_hardened",
  "v1_1_dry_run_production_rpc_not_callable",
  "v1_1_dry_run_public_security_definer_drift",
  "v1_1_dry_run_reader_role_must_be_absent",
  "v1_1_dry_run_remote_floor_drift",
  "v1_1_dry_run_rollback_floor_drift",
  "v1_1_dry_run_rollback_reader_persisted",
  "v1_1_dry_run_rollback_schema_persisted",
];

const parseArgs = (argv) => {
  const value = (name) => {
    const index = argv.indexOf(name);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  const parsed = {
    host: value("--host"),
    port: Number(value("--port")),
    user: value("--user"),
    database: value("--database"),
    file: value("--file"),
    caFile: value("--ca-file"),
  };
  if (parsed.host !== expected.host
      || parsed.port !== expected.port
      || parsed.user !== expected.user
      || parsed.database !== expected.database
      || typeof parsed.file !== "string"
      || parsed.file.length === 0
      || typeof parsed.caFile !== "string"
      || parsed.caFile.length === 0) {
    throw new Error("DIRECT_QUERY_TARGET_DRIFT");
  }
  return parsed;
};

export const readPinnedSupabaseCa = (caFile) => {
  let ca;
  let certificate;
  try {
    ca = readFileSync(caFile, "utf8");
    certificate = new X509Certificate(ca);
  } catch {
    throw new Error("DIRECT_QUERY_CA_INVALID");
  }
  if (certificate.fingerprint256 !== expectedCaFingerprint256
      || certificate.ca !== true
      || Date.parse(certificate.validFrom) > Date.now()
      || Date.parse(certificate.validTo) <= Date.now()) {
    throw new Error("DIRECT_QUERY_CA_DRIFT");
  }
  return ca;
};

export const parseCredentialInput = (input) => {
  let parsed;
  try {
    parsed = JSON.parse(input);
  } catch {
    throw new Error("DIRECT_QUERY_CREDENTIAL_INPUT_INVALID");
  }
  if (Object.keys(parsed ?? {}).length !== 1
      || typeof parsed.password !== "string"
      || parsed.password.length < 8
      || parsed.password.length > 1024) {
    throw new Error("DIRECT_QUERY_CREDENTIAL_INPUT_INVALID");
  }
  return parsed.password;
};

export const sanitizePostgresError = (error) => {
  const message = typeof error?.message === "string" ? error.message : "";
  const code = typeof error?.code === "string" && /^[0-9A-Z]{5}$/u.test(error.code)
    ? error.code
    : null;
  return {
    failure_class: code ? "POSTGRES_QUERY_ERROR" : "POSTGRES_CONNECTION_OR_CLIENT_ERROR",
    sqlstate: code,
    dry_run_guard: safeDryRunMarkers.find((marker) => message.includes(marker)) ?? null,
    raw_error_persisted: false,
    output_digest_persisted: false,
  };
};

const selectFinalRows = (result) => {
  const results = Array.isArray(result) ? result : [result];
  const final = results.at(-1);
  if (!final || !Array.isArray(final.rows)) throw new Error("DIRECT_QUERY_RESULT_INVALID");
  return final.rows;
};

export const executeSimpleQuery = async ({ target, password, sql, ca, ClientClass = Client }) => {
  const client = new ClientClass({
    host: target.host,
    port: target.port,
    user: target.user,
    database: target.database,
    password,
    ssl: { ca, rejectUnauthorized: true, servername: target.host },
    application_name: "rewireperform_v11_rollback_dry_run",
    connectionTimeoutMillis: 15_000,
    query_timeout: 210_000,
  });
  let queryResult;
  try {
    await client.connect();
    // No values array: node-postgres uses the Simple Query Protocol and sends
    // this entire transaction as exactly one PostgreSQL query call.
    queryResult = await client.query(sql);
  } finally {
    // A resolved end() is part of the safety contract: the caller starts its
    // fresh audit only after this process has closed the PostgreSQL session.
    await client.end();
  }
  return selectFinalRows(queryResult);
};

const isMain = process.argv[1]
  && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  try {
    const target = parseArgs(process.argv.slice(2));
    const password = parseCredentialInput(readFileSync(0, "utf8"));
    const sql = readFileSync(target.file, "utf8");
    const ca = readPinnedSupabaseCa(target.caFile);
    const rows = await executeSimpleQuery({ target, password, sql, ca });
    process.stdout.write(`${JSON.stringify(rows)}\n`);
  } catch (error) {
    process.stderr.write(`${JSON.stringify(sanitizePostgresError(error))}\n`);
    process.exitCode = 1;
  }
}
