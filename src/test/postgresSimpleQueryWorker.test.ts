// @vitest-environment node

import { describe, expect, it } from "vitest";
import pg from "../../tools/production-rollback-dry-run/node_modules/pg/lib/index.js";
import pgPackage from "../../tools/production-rollback-dry-run/node_modules/pg/package.json";
import {
  executeSimpleQuery,
  parseCredentialInput,
  readPinnedSupabaseCa,
  sanitizePostgresError,
} from "../../scripts/execute-postgres-simple-query.mjs";

const target = {
  host: "aws-1-eu-central-1.pooler.supabase.com",
  port: 5432,
  user: "postgres.bqsbxesmybthwtxmowfz",
  database: "postgres",
};

type ClientState = {
  config?: Record<string, unknown>;
  connectCalls: number;
  queryCalls: unknown[][];
  endCalls: number;
};

const clientDouble = ({ queryFailure, endFailure }: {
  queryFailure?: Error;
  endFailure?: Error;
} = {}) => {
  const state: ClientState = { connectCalls: 0, queryCalls: [], endCalls: 0 };
  class ClientDouble {
    constructor(config: Record<string, unknown>) {
      state.config = config;
    }

    async connect() {
      state.connectCalls += 1;
    }

    async query(...args: unknown[]) {
      state.queryCalls.push(args);
      if (queryFailure) throw queryFailure;
      return [
        { rows: [] },
        { rows: [{ v1_1_dry_run_rollback_status: { status: "PASS" } }] },
      ];
    }

    async end() {
      state.endCalls += 1;
      if (endFailure) throw endFailure;
    }
  }
  return { ClientDouble, state };
};

describe("direct PostgreSQL Simple Query worker", () => {
  it("pins node-postgres to Simple Query Protocol for a parameterless transaction batch", () => {
    expect(pgPackage.version).toBe("8.23.0");
    const query = new pg.Query("BEGIN; SELECT 1; ROLLBACK;");
    expect(query.requiresPreparation()).toBe(false);
  });

  it("accepts only one bounded stdin credential object", () => {
    expect(parseCredentialInput(JSON.stringify({ password: "temporary-secret" })))
      .toBe("temporary-secret");
    expect(() => parseCredentialInput("not-json")).toThrow("CREDENTIAL_INPUT_INVALID");
    expect(() => parseCredentialInput(JSON.stringify({ password: "short" })))
      .toThrow("CREDENTIAL_INPUT_INVALID");
    expect(() => parseCredentialInput(JSON.stringify({ password: "temporary-secret", extra: true })))
      .toThrow("CREDENTIAL_INPUT_INVALID");
  });

  it("uses one plain multi-statement query, verified TLS, and closes the session", async () => {
    const { ClientDouble, state } = clientDouble();
    const sql = "BEGIN;\nSELECT 1;\nROLLBACK;\nSELECT 2;";
    const rows = await executeSimpleQuery({
      target,
      password: "temporary-secret",
      sql,
      ca: "pinned-supabase-ca",
      ClientClass: ClientDouble,
    });

    expect(state.connectCalls).toBe(1);
    expect(state.queryCalls).toEqual([[sql]]);
    expect(state.endCalls).toBe(1);
    expect(state.config).toMatchObject({
      ...target,
      password: "temporary-secret",
      ssl: { ca: "pinned-supabase-ca", rejectUnauthorized: true, servername: target.host },
      application_name: "rewireperform_v11_rollback_dry_run",
      connectionTimeoutMillis: 15_000,
      query_timeout: 210_000,
    });
    expect(rows).toEqual([{ v1_1_dry_run_rollback_status: { status: "PASS" } }]);
  });

  it("closes after query failure and fails if connection closure is not proven", async () => {
    const queryError = Object.assign(new Error("secret v1_1_dry_run_remote_floor_drift"), {
      code: "P0001",
    });
    const failed = clientDouble({ queryFailure: queryError });
    await expect(executeSimpleQuery({
      target,
      password: "temporary-secret",
      sql: "BEGIN; SELECT forbidden; ROLLBACK;",
      ca: "pinned-supabase-ca",
      ClientClass: failed.ClientDouble,
    })).rejects.toBe(queryError);
    expect(failed.state.queryCalls).toHaveLength(1);
    expect(failed.state.endCalls).toBe(1);

    const endError = new Error("connection close not proven");
    const unclosed = clientDouble({ endFailure: endError });
    await expect(executeSimpleQuery({
      target,
      password: "temporary-secret",
      sql: "SELECT 1;",
      ca: "pinned-supabase-ca",
      ClientClass: unclosed.ClientDouble,
    })).rejects.toBe(endError);
    expect(unclosed.state.endCalls).toBe(1);
  });

  it("accepts only the pinned, currently valid Supabase root CA", () => {
    expect(readPinnedSupabaseCa("config/certs/supabase-prod-root-2021.crt"))
      .toContain("BEGIN CERTIFICATE");
    expect(() => readPinnedSupabaseCa("package.json")).toThrow("CA_INVALID");
  });

  it("emits only allowlisted diagnostics", () => {
    const secret = "athlete@example.test private-journal";
    const diagnostic = sanitizePostgresError(Object.assign(
      new Error(`${secret} v1_1_dry_run_public_security_definer_drift`),
      { code: "42501" },
    ));
    expect(diagnostic).toEqual({
      failure_class: "POSTGRES_QUERY_ERROR",
      sqlstate: "42501",
      dry_run_guard: "v1_1_dry_run_public_security_definer_drift",
      raw_error_persisted: false,
      output_digest_persisted: false,
    });
    expect(JSON.stringify(diagnostic)).not.toContain(secret);
  });
});
