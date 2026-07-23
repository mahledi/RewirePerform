import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = resolve(root, "docs/mahleos-handoff/feedback-contract/v1");
const checkOnly = process.argv.includes("--check");
const schemaBase = "https://rewireperform.com/contracts/mahleos-feedback/v1";

const strictObject = (required, properties, extra = {}) => ({
  type: "object",
  required,
  properties,
  additionalProperties: false,
  ...extra,
});
const schema = (name, title, body) => ({
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: `${schemaBase}/${name}.schema.json`,
  title,
  ...body,
});
const dateTime = {
  type: "string",
  pattern: "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,6})?(?:Z|[+-]\\d{2}:\\d{2})$",
};
const uuid = {
  type: "string",
  pattern: "^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
};
const sha256 = { type: "string", pattern: "^[a-f0-9]{64}$" };
const nullableCursor = {
  type: ["string", "null"],
  pattern: "^[A-Za-z0-9_-]{1,256}$",
};

const technicalContext = strictObject(
  ["schema_version", "runtime", "platform", "route", "online", "app_version"],
  {
    schema_version: { const: "feedback-technical-context-v1" },
    runtime: { enum: ["native", "standalone", "browser", "unknown"] },
    platform: { enum: ["ios", "android", "web", "unknown"] },
    route: {
      type: ["string", "null"],
      pattern: "^/[^?#]{0,159}$",
    },
    online: { type: ["boolean", "null"] },
    app_version: {
      type: "string",
      pattern: "^[A-Za-z0-9_.:/-]{1,96}$",
    },
  },
);

const requestSchema = schema(
  "feedback-read-request",
  "MahleOS feedback read request v1",
  strictObject([], {
    cursor: nullableCursor,
    limit: { type: "integer", minimum: 1, maximum: 25 },
  }),
);

const successSchema = schema(
  "feedback-read-success",
  "MahleOS feedback read success v1",
  strictObject(
    [
      "ok",
      "schema_version",
      "request_id",
      "generated_at",
      "items",
      "has_more",
      "next_cursor",
      "privacy",
    ],
    {
      ok: { const: true },
      schema_version: { const: "mahleos-feedback-read-v1.1" },
      request_id: uuid,
      generated_at: dateTime,
      items: {
        type: "array",
        maxItems: 25,
        items: strictObject(
          [
            "feedback_reference",
            "category",
            "status",
            "created_at",
            "message",
            "technical_context",
          ],
          {
            feedback_reference: sha256,
            category: { enum: ["bug", "suggestion", "general", "other"] },
            status: { enum: ["open", "reviewed", "resolved", "unknown"] },
            created_at: dateTime,
            message: { type: "string", minLength: 1, maxLength: 2000 },
            technical_context: technicalContext,
          },
        ),
      },
      has_more: { type: "boolean" },
      next_cursor: nullableCursor,
      privacy: strictObject(
        [
          "structured_user_identifiers_exported",
          "recognized_direct_identifiers_redacted",
          "free_text_may_contain_personal_data",
          "admin_notes_exported",
          "attachments_exported",
          "model_safe_without_redaction",
        ],
        {
          structured_user_identifiers_exported: { const: false },
          recognized_direct_identifiers_redacted: { const: true },
          free_text_may_contain_personal_data: { const: true },
          admin_notes_exported: { const: false },
          attachments_exported: { const: false },
          model_safe_without_redaction: { const: false },
        },
      ),
    },
    {
      allOf: [
        {
          if: { properties: { has_more: { const: true } }, required: ["has_more"] },
          then: { properties: { next_cursor: { type: "string", pattern: "^[A-Za-z0-9_-]{1,256}$" } } },
          else: { properties: { next_cursor: { const: null } } },
        },
      ],
    },
  ),
);

const errorSchema = schema(
  "error-response",
  "MahleOS feedback read error v1",
  strictObject(
    ["error"],
    {
      error: {
        enum: [
          "invalid_request",
          "invalid_json",
          "unauthorized",
          "method_not_allowed",
          "request_too_large",
          "unsupported_media_type",
          "rate_limited",
          "service_not_configured",
          "feedback_read_unavailable",
          "contract_projection_failed",
        ],
      },
      request_id: uuid,
    },
  ),
);

const generatedAt = "2026-07-23T15:30:00.000Z";
const requestId = "90000000-0000-4000-8000-000000000701";

const manifest = {
  contract_id: "rewireperform-mahleos-feedback-read",
  contract_version: "1.1.0",
  status: "IMPLEMENTED_NOT_PRODUCTION_ACTIVATED",
  endpoint: {
    path: "/functions/v1/mahleos-feedback-read",
    method: "POST",
    content_type: "application/json",
    max_request_bytes: 1024,
    max_page_size: 25,
    rate_limit_per_client_per_minute: 30,
    redirects_allowed: false,
  },
  authentication: {
    scheme: "Bearer",
    key_format: "64 hexadecimal characters",
    current_secret: "MAHLEOS_FEEDBACK_READ_KEY",
    previous_secret: "MAHLEOS_FEEDBACK_READ_KEY_PREVIOUS",
    shared_with_aggregate_api: false,
  },
  retry_policy: {
    retryable_http_statuses: [429, 503],
    non_retryable_http_statuses: [400, 401, 405, 413, 415],
    maximum_attempts: 2,
  },
  privacy_boundaries: {
    test_data_included: false,
    structured_user_identifiers_exported: false,
    recognized_direct_identifiers_redacted: true,
    free_text_may_contain_personal_data: true,
    admin_notes_exported: false,
    attachments_exported: false,
    raw_feedback_persistence_in_mahleos: "FORBIDDEN",
    model_use_before_local_redaction: "FORBIDDEN",
    sensitive_feedback_model_use: "FORBIDDEN",
  },
  consumer_policy: {
    unknown_schema_versions: "BLOCK",
    unknown_fields: "BLOCK",
    missing_source_status: "NOT_CONNECTED",
    source_may_make_global_status_green: false,
    push_merge_deploy: "HUMAN_APPROVAL_REQUIRED",
  },
};

const goldenSuccess = {
  ok: true,
  schema_version: "mahleos-feedback-read-v1.1",
  request_id: requestId,
  generated_at: generatedAt,
  items: [
    {
      feedback_reference: "a".repeat(64),
      category: "bug",
      status: "open",
      created_at: generatedAt,
      message: "Beim Speichern blieb die Ansicht offen.",
      technical_context: {
        schema_version: "feedback-technical-context-v1",
        runtime: "native",
        platform: "ios",
        route: "/settings",
        online: true,
        app_version: "1.0.0",
      },
    },
  ],
  has_more: false,
  next_cursor: null,
  privacy: {
    structured_user_identifiers_exported: false,
    recognized_direct_identifiers_redacted: true,
    free_text_may_contain_personal_data: true,
    admin_notes_exported: false,
    attachments_exported: false,
    model_safe_without_redaction: false,
  },
};

const readme = `# RewirePerform -> MahleOS Feedback Contract v1

This package defines a separate read-only channel for user-submitted feedback.
It is intentionally not part of the aggregate Tracking or Evidence contract.

## Hard boundaries

- Dedicated 256-bit machine credential; never an admin password.
- HTTPS POST only, no redirects and no free filters.
- No structured names, emails, account IDs, admin notes or attachments.
- Recognized email addresses, phone numbers and credential-shaped values are
  redacted before export. Free text can still contain personal data, including
  names, and must therefore be treated as personal data.
- Production feedback only; marked test users are excluded.
- Raw feedback text is processed ephemerally by MahleOS and is never persisted.
- Local redaction runs before any optional model analysis.
- Feedback concerning minors, mental health, privacy or secrets is never sent
  automatically to a model.
- Unknown fields or schema versions block the source.

The package does not deploy the Edge Function, apply its migration, install a
secret, connect MahleOS or activate automation. The reviewed producer commit is
pinned by the bilateral handoff after all release gates pass.
`;

const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const files = new Map([
  ["README.md", readme],
  ["manifest.json", json(manifest)],
  ["schemas/feedback-read-request.schema.json", json(requestSchema)],
  ["schemas/feedback-read-success.schema.json", json(successSchema)],
  ["schemas/error-response.schema.json", json(errorSchema)],
  ["golden/feedback-read.requests.json", json([
    {},
    { limit: 10 },
    { cursor: null, limit: 25 },
  ])],
  ["golden/feedback-read.success.json", json(goldenSuccess)],
  ["golden/error-responses.json", json([
    { error: "invalid_request", request_id: requestId },
    { error: "invalid_json" },
    { error: "unauthorized" },
    { error: "method_not_allowed" },
    { error: "request_too_large" },
    { error: "unsupported_media_type" },
    { error: "rate_limited", request_id: requestId },
    { error: "service_not_configured" },
    { error: "feedback_read_unavailable", request_id: requestId },
    { error: "contract_projection_failed", request_id: requestId },
  ])],
]);

const listFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
  const paths = [];
  for (const entry of entries) {
    const target = resolve(directory, entry.name);
    if (entry.isDirectory()) paths.push(...await listFiles(target));
    else paths.push(target);
  }
  return paths;
};

let drift = false;
for (const existing of await listFiles(outputDir)) {
  const name = relative(outputDir, existing);
  if (files.has(name)) continue;
  if (checkOnly) {
    console.error(`Unexpected MahleOS feedback contract artifact: ${name}`);
    drift = true;
  } else {
    await rm(existing);
    console.log(`Removed ${name}`);
  }
}

for (const [name, content] of files) {
  const target = resolve(outputDir, name);
  if (checkOnly) {
    const current = await readFile(target, "utf8").catch(() => "");
    if (current !== content) {
      console.error(`MahleOS feedback contract artifact is out of date: ${name}`);
      drift = true;
    }
  } else {
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content, "utf8");
    console.log(`Generated ${name}`);
  }
}

if (drift) process.exit(1);
