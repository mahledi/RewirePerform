import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";

const contractRoot = resolve(
  process.cwd(),
  "docs/mahleos-handoff/contracts/v1",
);
const readJson = <T>(path: string): T => JSON.parse(
  readFileSync(resolve(contractRoot, path), "utf8"),
) as T;

const schemaFiles = [
  "system-health",
  "tracking-quality",
  "feedback-status",
  "pilot-readiness",
  "pilot-catalog",
  "solo-readiness",
  "evidence-status",
  "admin-overview",
  "admin-teams",
  "admin-comprehension",
  "admin-feedback-metadata",
  "admin-partner-requests",
  "daily-brief",
  "operations-request",
  "operations-success",
  "error-response",
  "evidence-read-request",
  "evidence-read-success",
];
const schemas = schemaFiles.map((name) => readJson<Record<string, unknown>>(
  `schemas/${name}.schema.json`,
));
const ajv = new Ajv2020({
  allErrors: true,
  allowUnionTypes: true,
  strict: true,
});
for (const contractSchema of schemas) ajv.addSchema(contractSchema);

const validateWith = (schemaName: string, value: unknown) => {
  const validate = ajv.getSchema(
    `https://rewireperform.com/contracts/mahleos/v1/${schemaName}.schema.json`,
  );
  expect(validate, `Missing schema ${schemaName}`).toBeTypeOf("function");
  const valid = validate?.(value);
  expect(validate?.errors ?? [], JSON.stringify(validate?.errors, null, 2)).toEqual([]);
  expect(valid).toBe(true);
};

describe("MahleOS machine-readable handoff", () => {
  it("publishes an explicit POST-only, fail-closed transport manifest", () => {
    const manifest = readJson<{
      contract_version: string;
      status: string;
      operations_endpoint: { method: string; views: string[] };
      retry_policy: { retryable_http_statuses: number[]; redirects_allowed: boolean };
      consumer_policy: Record<string, string>;
      privacy_boundaries: { minimum_sensitive_aggregate_n: number; forbidden: string[] };
    }>("manifest.json");

    expect(manifest.contract_version).toBe("1.2.0");
    expect(manifest.status).toBe("IMPLEMENTED_NOT_PRODUCTION_ACTIVATED");
    expect(manifest.operations_endpoint.method).toBe("POST");
    expect(manifest.operations_endpoint.views).toEqual([
      "daily_brief",
      "system_health",
      "tracking_quality",
      "feedback_status",
      "pilot_readiness",
      "pilot_catalog",
      "solo_readiness",
      "evidence_status",
      "admin_overview",
      "admin_teams",
      "admin_comprehension",
      "admin_feedback_metadata",
      "admin_partner_requests",
    ]);
    expect(manifest.retry_policy).toEqual(expect.objectContaining({
      retryable_http_statuses: [429, 503],
      redirects_allowed: false,
    }));
    expect(manifest.consumer_policy.unknown_schema_versions).toBe("BLOCK");
    expect(manifest.consumer_policy.incomplete_source_coverage).toBe("MUST_NOT_REPORT_GREEN");
    expect(manifest.privacy_boundaries.minimum_sensitive_aggregate_n).toBe(5);
    expect(manifest.privacy_boundaries.forbidden).toContain("journal_text");
    expect(manifest.privacy_boundaries.forbidden).toContain("individual_scores");
  });

  it("validates every synthetic operations Golden Response", () => {
    for (const name of [
      "daily-brief",
      "system-health",
      "tracking-quality",
      "feedback-status",
      "pilot-readiness",
      "pilot-catalog",
      "solo-readiness",
      "evidence-status",
      "admin-overview",
      "admin-teams",
      "admin-comprehension",
      "admin-feedback-metadata",
      "admin-partner-requests",
    ]) {
      validateWith(
        "operations-success",
        readJson(`golden/${name}.success.json`),
      );
    }
  });

  it("validates every allow-listed request and rejects widened request bodies", () => {
    for (const request of readJson<unknown[]>("golden/operations-requests.json")) {
      validateWith("operations-request", request);
    }
    for (const request of readJson<unknown[]>("golden/evidence-read-requests.json")) {
      validateWith("evidence-read-request", request);
    }

    const operationsValidator = ajv.getSchema(
      "https://rewireperform.com/contracts/mahleos/v1/operations-request.schema.json",
    );
    expect(operationsValidator?.({ view: "pilot_catalog", team_id: "blocked" })).toBe(false);

    const evidenceValidator = ajv.getSchema(
      "https://rewireperform.com/contracts/mahleos/v1/evidence-read-request.schema.json",
    );
    expect(evidenceValidator?.({ scope_type: "solo_aggregate", user_id: "blocked" })).toBe(false);
  });

  it("validates the Evidence Data Lock envelope and every documented error", () => {
    validateWith(
      "evidence-read-success",
      readJson("golden/evidence-read.success.json"),
    );
    for (const error of readJson<unknown[]>("golden/error-responses.json")) {
      validateWith("error-response", error);
    }
  });

  it("rejects unknown fields instead of silently accepting contract drift", () => {
    const response = readJson<Record<string, unknown>>(
      "golden/daily-brief.success.json",
    );
    const withUnknownField = { ...response, private_dump: true };
    const validate = ajv.getSchema(
      "https://rewireperform.com/contracts/mahleos/v1/operations-success.schema.json",
    );

    expect(validate?.(withUnknownField)).toBe(false);

    const pilotResponse = readJson<Record<string, unknown>>(
      "golden/pilot-readiness.success.json",
    );
    const data = pilotResponse.data as Record<string, unknown>;
    const withAthleteList = {
      ...pilotResponse,
      data: { ...data, athlete_names: ["blocked"] },
    };
    expect(validate?.(withAthleteList)).toBe(false);
  });
});
