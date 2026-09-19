#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const producerCommit = "07ae1c0579432de220c8098079d17eb4f26f1bea";
const manifestPath = "docs/feedback-intelligence/contracts/coach-invitation-privacy-delta-v1.1/producer-package-manifest.json";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const historicalFile = (path) => execFileSync(
  "git",
  ["show", `${producerCommit}:${path}`],
  { cwd: root },
);

const currentManifest = await readFile(resolve(root, manifestPath));
const historicalManifest = historicalFile(manifestPath);
if (!currentManifest.equals(historicalManifest)) {
  throw new Error("coach invitation V1.1 manifest must remain the recorded historical package");
}

const manifest = JSON.parse(historicalManifest.toString("utf8"));
const digestInput = [];
for (const file of manifest.files) {
  const bytes = historicalFile(file.path);
  const actual = sha256(bytes);
  if (actual !== file.sha256) {
    throw new Error(`historical coach invitation privacy byte drift: ${file.path}`);
  }
  digestInput.push(`${actual}  ${file.path}\n`);
}

if (sha256(digestInput.join("")) !== manifest.package_sha256) {
  throw new Error("historical coach invitation privacy package digest drift");
}

console.log(JSON.stringify({
  status: "COACH_INVITATION_PRIVACY_V1_1_HISTORICAL_PACKAGE_VERIFIED",
  producer_commit: producerCommit,
  package_sha256: manifest.package_sha256,
  files: manifest.files.length,
}, null, 2));
