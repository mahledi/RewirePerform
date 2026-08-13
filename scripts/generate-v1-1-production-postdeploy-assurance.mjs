#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expectedRemoteMigrationVersions } from "./run-v1-1-production-rollback-dry-run.mjs";

const root = process.cwd();
const checkOnly = process.argv.includes("--check");
const base = "docs/feedback-intelligence/contracts/production-postdeploy-assurance-v0.1";
const planPath = `${base}/assurance-plan.json`;
const schemaPath = `${base}/postdeploy-evidence.schema.json`;
const manifestPath = `${base}/producer-package-manifest.json`;
const persistentPlanPath =
  "docs/feedback-intelligence/contracts/production-persistent-apply-v0.1/plan.json";
const persistentManifestPath =
  "docs/feedback-intelligence/contracts/production-persistent-apply-v0.1/producer-package-manifest.json";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const productionFeedbackSecretNames = [
  "MAHLEOS_FEEDBACK_PRODUCTION_MACHINE_KEY",
  "MAHLEOS_FEEDBACK_PRODUCTION_MACHINE_KEY_PREVIOUS",
  "MAHLEOS_FEEDBACK_PRODUCTION_READER_DATABASE_URL",
  "MAHLEOS_FEEDBACK_PRODUCTION_MACHINE_GATE",
  "MAHLEOS_FEEDBACK_PRODUCTION_REAL_DATA_GATE",
];
const productionEdgeSlugs = [
  "mahleos-feedback-intelligence-production-read",
  "submit-organization-access-request",
];

const exactObjectSchema = (properties) => ({
  type: "object",
  additionalProperties: false,
  required: Object.keys(properties),
  properties,
});

export const composeProductionPostdeployAssurance = async ({ cwd = root } = {}) => {
  const [persistentPlanBytes, persistentManifestBytes] = await Promise.all([
    readFile(resolve(cwd, persistentPlanPath)),
    readFile(resolve(cwd, persistentManifestPath)),
  ]);
  const persistentPlan = JSON.parse(persistentPlanBytes.toString("utf8"));
  const persistentManifest = JSON.parse(persistentManifestBytes.toString("utf8"));
  if (persistentPlan.project_ref !== "bqsbxesmybthwtxmowfz"
      || persistentPlan.step_count !== 25
      || persistentManifest.status !== "LOCAL_PREPARED_EXTERNAL_GATES_CLOSED"
      || Object.values(persistentManifest.activation).some((value) => value !== false)) {
    throw new Error("Production persistent apply package drift");
  }
  const floor = expectedRemoteMigrationVersions(cwd);
  const applied = persistentPlan.steps.map(({ version }) => version);
  const finalVersions = [...floor, ...applied];
  if (new Set(finalVersions).size !== finalVersions.length
      || JSON.stringify(finalVersions) !== JSON.stringify([...finalVersions].sort())) {
    throw new Error("Production postdeploy migration inventory drift");
  }

  const expectedResult = {
    status: "PASS_V1_1_PRODUCTION_MIGRATIONS_APPLIED_RUNTIME_CLOSED",
    project_ref: "bqsbxesmybthwtxmowfz",
    source_package_sha256: persistentManifest.package_sha256,
    completed_migrations: applied.length,
    completed_versions_sha256: sha256(`${applied.join("\n")}\n`),
    final_remote_migration_count: finalVersions.length,
    final_remote_versions_sha256: sha256(`${finalVersions.join("\n")}\n`),
    target_audit_status: "PASS_V1_1_PERSISTENT_TARGET_METADATA_AUDIT",
    retry_count: 0,
    credential_persisted_by_operator: false,
    application_values_returned: false,
    runtime_activation_authorized: false,
  };
  const plan = {
    schema_version: "rewireperform-v1.1-production-postdeploy-assurance-plan-v1",
    status: "LOCAL_ASSURANCE_CONTRACT_PREPARED_PRODUCTION_NOT_APPLIED",
    generated_at: "2026-08-13T13:20:00+02:00",
    project_ref: expectedResult.project_ref,
    persistent_plan_sha256: sha256(persistentPlanBytes),
    persistent_manifest_sha256: sha256(persistentManifestBytes),
    persistent_package_sha256: persistentManifest.package_sha256,
    expected_result: expectedResult,
    required_control_plane_evidence: {
      exact_remote_migration_history: true,
      exact_edge_slugs: productionEdgeSlugs,
      exact_production_feedback_secret_names: productionFeedbackSecretNames,
      presence_only_secret_observation: true,
      production_feedback_reader_password_null: true,
      migration_application_rows_read: true,
      migration_application_read_scope: {
        "public.teams": ["id", "created_by"],
        "public.user_roles": ["user_id", "role"],
      },
      postdeploy_metadata_audit_application_rows_read: false,
      application_values_persisted_in_evidence: false,
    },
    activation: {
      database_apply_gate_open: false,
      edge_deploy: false,
      credentials: false,
      feedback_collection: false,
      feedback_comments: false,
      minor_feedback: false,
      real_jarvis: false,
      organization_inquiry_public: false,
      app_store_submission: false,
    },
    next_gate: "AWAIT_GREEN_ROLLBACK_BACKUP_AND_SEPARATE_PERSISTENT_APPLY_APPROVAL",
  };
  const schema = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://rewireperform.com/contracts/production-postdeploy-assurance-v0.1.schema.json",
    title: "RewirePerform V1.1 Production postdeploy assurance evidence",
    ...exactObjectSchema({
      schema_version: { const: "rewireperform-v1.1-production-postdeploy-assurance-evidence-v1" },
      observed_at: { type: "string", format: "date-time" },
      operator_result: exactObjectSchema(Object.fromEntries(
        Object.entries(expectedResult).map(([key, value]) => [key, { const: value }]),
      )),
      control_plane: exactObjectSchema({
        final_remote_migration_count: { const: expectedResult.final_remote_migration_count },
        final_remote_versions_sha256: { const: expectedResult.final_remote_versions_sha256 },
        edge_presence_observation: exactObjectSchema({
          source: { const: "supabase-functions-list-metadata-v1" },
          observation_sha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
          observed_slugs: exactObjectSchema(Object.fromEntries(
            productionEdgeSlugs.map((slug) => [slug, { const: false }]),
          )),
        }),
        secret_presence_observation: exactObjectSchema({
          source: { const: "supabase-secrets-list-presence-only-v1" },
          observation_sha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
          expected_secret_names: {
            type: "array",
            minItems: productionFeedbackSecretNames.length,
            maxItems: productionFeedbackSecretNames.length,
            prefixItems: productionFeedbackSecretNames.map((name) => ({ const: name })),
          },
          observed_presence: exactObjectSchema(Object.fromEntries(
            productionFeedbackSecretNames.map((name) => [name, { const: false }]),
          )),
          secret_values_read: { const: false },
          secret_values_persisted: { const: false },
          unrelated_secret_names_persisted: { const: false },
        }),
        reader_role_observation: exactObjectSchema({
          source: { const: "postgres-catalog-metadata-audit-v1" },
          observation_sha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
          role_name: { const: "mahleos_feedback_production_reader" },
          password_is_null: { const: true },
          application_rows_read: { const: false },
        }),
        combined_audit_provenance: exactObjectSchema({
          project_ref: { const: expectedResult.project_ref },
          contract: { const: "rewireperform-production-postdeploy-control-plane-audit-v1" },
          audit_sha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
        }),
      }),
      privacy: exactObjectSchema({
        migration_application_rows_read: { const: true },
        migration_application_read_scope: exactObjectSchema({
          "public.teams": {
            type: "array", minItems: 2, maxItems: 2,
            prefixItems: [{ const: "id" }, { const: "created_by" }],
          },
          "public.user_roles": {
            type: "array", minItems: 2, maxItems: 2,
            prefixItems: [{ const: "user_id" }, { const: "role" }],
          },
        }),
        postdeploy_metadata_audit_application_rows_read: { const: false },
        application_values_persisted: { const: false },
        credential_value_persisted: { const: false },
      }),
      gates: exactObjectSchema(Object.fromEntries(
        Object.keys(plan.activation).map((key) => [key, { const: false }]),
      )),
    }),
  };
  return { plan, schema };
};

const packageFiles = [
  planPath,
  schemaPath,
  persistentPlanPath,
  persistentManifestPath,
  "docs/feedback-intelligence/PRODUCTION_POSTDEPLOY_ASSURANCE_V1_1.md",
  "scripts/generate-v1-1-production-postdeploy-assurance.mjs",
  "scripts/run-v1-1-production-persistent-apply.mjs",
  "src/test/v11ProductionPostdeployAssurance.test.ts",
  "src/test/v11ProductionPersistentRunner.test.ts",
];

const isMain = process.argv[1]
  && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  const { plan, schema } = await composeProductionPostdeployAssurance();
  const serializedPlan = `${JSON.stringify(plan, null, 2)}\n`;
  const serializedSchema = `${JSON.stringify(schema, null, 2)}\n`;
  const files = [];
  const digestInput = [];
  for (const path of packageFiles) {
    const bytes = path === planPath
      ? Buffer.from(serializedPlan)
      : path === schemaPath
        ? Buffer.from(serializedSchema)
        : await readFile(resolve(root, path));
    const digest = sha256(bytes);
    files.push({ path, sha256: digest });
    digestInput.push(`${digest}  ${path}\n`);
  }
  const manifest = {
    schema_version: "rewireperform-v1.1-production-postdeploy-assurance-package-v1",
    status: plan.status,
    generated_at: plan.generated_at,
    package_sha256: sha256(digestInput.join("")),
    files,
    activation: plan.activation,
  };
  const serializedManifest = `${JSON.stringify(manifest, null, 2)}\n`;
  if (checkOnly) {
    const [currentPlan, currentSchema, currentManifest] = await Promise.all([
      readFile(resolve(root, planPath), "utf8"),
      readFile(resolve(root, schemaPath), "utf8"),
      readFile(resolve(root, manifestPath), "utf8"),
    ]);
    if (currentPlan !== serializedPlan) throw new Error(`${planPath}: generated plan drift`);
    if (currentSchema !== serializedSchema) throw new Error(`${schemaPath}: generated schema drift`);
    if (currentManifest !== serializedManifest) throw new Error(`${manifestPath}: generated manifest drift`);
    console.log(JSON.stringify({
      status: plan.status,
      expected_final_migrations: plan.expected_result.final_remote_migration_count,
      package_sha256: manifest.package_sha256,
      all_external_gates_closed: Object.values(manifest.activation).every((value) => value === false),
    }, null, 2));
  } else {
    await writeFile(resolve(root, planPath), serializedPlan, "utf8");
    await writeFile(resolve(root, schemaPath), serializedSchema, "utf8");
    await writeFile(resolve(root, manifestPath), serializedManifest, "utf8");
  }
}
