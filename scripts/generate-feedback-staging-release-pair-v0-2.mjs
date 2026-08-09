#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";

const root = process.cwd();
const checkOnly = process.argv.includes("--check");
const outputPath = "docs/feedback-intelligence/contracts/staging-release-pair-v0.2/release-pair.json";
const schemaPath = "docs/feedback-intelligence/contracts/staging-release-pair-v0.2/release-pair.schema.json";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const releasePair = {
  schema_version: "rewireperform-feedback-intelligence-staging-release-pair-v2",
  release_status: "UNSIGNED_AWAITING_CURRENT_CONSUMER_ACCEPTANCE",
  target_project_ref: "zbeswjipayspgvcipzmx",
  producer: {
    source_commit: "cbecd9066a1004ddb284ddcad3ae443d73b85451",
    gateway_manifest_sha256: "97b4caf3109650be74963587c1340ddd699e0aa80b6acf587da79cfdf0ed001d",
    gateway_package_sha256: "15c85f345592c7df3b0c700134ff5ab2c6b7b86b3ea64e4a7088168a488dbbbb",
    audit_contract_version: "0.2.0-draft",
    audit_manifest_sha256: "f65b0456edb901b17da5e56b7c7f82244450016e67b91b50974f75c573557b0e",
    audit_package_sha256: "9fe6919092f8d56ea76396418721a401cc03d8961ade99cd7be055c602741ec0",
    audit_sql_sha256: "7f7865f769f46bfab204c37d071ee743636fe183f6d6876a24557e51dc508bd3",
    data_path_definition_sha256: {
      gateway: "0d617fcb5e5a7ece31ca94b7ff0cf07026712b0d9ed4206c95bee9f4b198a8af",
      internal_export: "89420ddf3f79ad57538f4fb1ad56458717874490ddbc88b52d577e081d3e872f",
    },
  },
  consumer: {
    branch: "agent/feedback-intelligence-machine-gateway-v0-1-20260807",
    current_source_commit: "ec197d6bcfb32e02596024f61d0fa2e0011fb871",
    acceptance_status: "PENDING_CURRENT_PACKAGE_REVIEW",
    acceptance_commit: null,
    acceptance_sha256: null,
  },
  invalidated_historical_gate: {
    producer_commit: "077a35f82fe7fd7972621a9c2ea1cc481ff991e0",
    consumer_commit: "266eac3d362ede7ceafd2c25b6109d3c2d8c8bc0",
    reason: "PRE_REMEDIATION_FUNCTION_DEFINITIONS",
    can_authorize_current_gate: false,
  },
  next_gate: {
    consumer_review_required: true,
    migration_and_edge_staging: false,
    postdeploy_metadata_audit: false,
    credentials: false,
    synthetic_network_read: false,
    production: false,
    real_data: false,
    writes: false,
  },
};
const schema = JSON.parse(await readFile(resolve(root, schemaPath), "utf8"));
const validate = new Ajv2020({ strict: true, validateFormats: false }).compile(schema);
if (!validate(releasePair)) {
  console.error(JSON.stringify(validate.errors, null, 2));
  process.exit(1);
}
const serialized = `${JSON.stringify(releasePair, null, 2)}\n`;

if (checkOnly) {
  const current = await readFile(resolve(root, outputPath), "utf8");
  if (current !== serialized) {
    console.error(`${outputPath}: generated release-pair drift`);
    process.exit(1);
  }
  console.log(JSON.stringify({
    status: "UNSIGNED_REMEDIATION_RELEASE_PAIR_VERIFIED_AWAITING_CONSUMER",
    release_pair_sha256: sha256(current),
    producer_commit: releasePair.producer.source_commit,
    consumer_commit: releasePair.consumer.current_source_commit,
    consumer_review_required: releasePair.next_gate.consumer_review_required,
    credentials_closed: !releasePair.next_gate.credentials,
    production_closed: !releasePair.next_gate.production
  }, null, 2));
} else {
  await writeFile(resolve(root, outputPath), serialized, "utf8");
  console.log(`${outputPath} written`);
}
