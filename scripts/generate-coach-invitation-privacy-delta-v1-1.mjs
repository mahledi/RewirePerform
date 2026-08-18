#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const checkOnly = process.argv.includes("--check");
const manifestPath = "docs/feedback-intelligence/contracts/coach-invitation-privacy-delta-v1.1/producer-package-manifest.json";
const packageFiles = [
  "src/pages/Privacy.tsx",
  "supabase/functions/send-organization-access-invitation/index.ts",
  "src/components/admin/OrganizationRequestManager.tsx",
  "supabase/config.toml",
  "docs/V1_1_RELEASE_OPERATIONS_2026-08-09.md",
  "src/test/organizationInvitationDeliveryContract.test.ts",
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const files = [];
const digestInput = [];

for (const path of packageFiles) {
  const bytes = await readFile(resolve(root, path));
  const digest = sha256(bytes);
  files.push({ path, sha256: digest });
  digestInput.push(`${digest}  ${path}\n`);
}

const activation = {
  production_edge_function_deployed: false,
  production_email_sender_configured: false,
  resend_tracking_disabled_verified: false,
  live_invitation_delivery_verified: false,
  production_database_mutated_by_this_delta: false,
  feedback_or_jarvis_activated: false,
};
const manifest = {
  schema_version: "rewireperform-coach-invitation-privacy-delta-v1",
  delta_version: "coach-invitation-privacy-delta-v1.1.0",
  status: "LOCAL_REVIEW_CANDIDATE_NOT_ACTIVATED",
  purpose: "personal, admin-approved Coach access after a public team or organization request",
  processor: {
    name: "Resend",
    data_categories: [
      "recipient email address",
      "transactional email content including one-time personal access link",
      "delivery metadata",
    ],
    exclusions: [
      "athlete data",
      "check-ins",
      "journals",
      "private reflections",
      "feedback comments",
      "Jarvis data",
      "open and click tracking",
    ],
  },
  invitation_boundary: {
    trigger: "personal admin approval",
    email_bound: true,
    one_time: true,
    expires_after: "7 days",
    co_coach_share_code_included: false,
  },
  historical_boundary: {
    feedback_consent_package: "unchanged historical package at e50d6e68a0bbd25064e3752f94eed1ad9d5ff552",
    feedback_or_jarvis_scope_changed: false,
  },
  activation,
  package_digest_algorithm: "sha256 over exact UTF-8 lines of sha256, two spaces and relative path in manifest order",
  package_sha256: sha256(digestInput.join("")),
  files,
};
const serialized = `${JSON.stringify(manifest, null, 2)}\n`;

if (checkOnly) {
  const current = await readFile(resolve(root, manifestPath), "utf8");
  if (current !== serialized) {
    throw new Error(`${manifestPath}: generated manifest drift`);
  }
  if (!Object.values(activation).every((value) => value === false)) {
    throw new Error("coach invitation privacy delta activation gate unexpectedly open");
  }
  console.log(JSON.stringify({
    status: "COACH_INVITATION_PRIVACY_DELTA_VERIFIED_NOT_ACTIVATED",
    package_sha256: manifest.package_sha256,
    files: files.length,
    activation_gates_closed: true,
  }, null, 2));
} else {
  await writeFile(resolve(root, manifestPath), serialized, "utf8");
  console.log(`${manifestPath} written`);
}
