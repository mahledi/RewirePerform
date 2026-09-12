#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const producerCommit = "e50d6e68a0bbd25064e3752f94eed1ad9d5ff552";
const manifestPath = "docs/feedback-intelligence/contracts/consent-v1.1/producer-package-manifest.json";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const historicalFile = (path) => execFileSync(
  "git",
  ["show", `${producerCommit}:${path}`],
  { cwd: root },
);

const currentManifest = await readFile(resolve(root, manifestPath));
const historicalManifest = historicalFile(manifestPath);
if (!currentManifest.equals(historicalManifest)) {
  throw new Error("final feedback consent manifest must remain the recorded historical package");
}

const manifest = JSON.parse(historicalManifest.toString("utf8"));
const digestInput = [];
for (const file of manifest.files) {
  const bytes = historicalFile(file.path);
  const actual = sha256(bytes);
  if (actual !== file.sha256) {
    throw new Error(`historical feedback consent byte drift: ${file.path}`);
  }
  digestInput.push(`${actual}  ${file.path}\n`);
}

if (sha256(digestInput.join("")) !== manifest.package_sha256) {
  throw new Error("historical feedback consent package digest drift");
}

console.log(JSON.stringify({
  status: "FINAL_DE_CONSENT_HISTORICAL_PACKAGE_VERIFIED_CURRENT_RUNTIME_CLOSED",
  producer_commit: producerCommit,
  package_sha256: manifest.package_sha256,
  files: manifest.files.length,
}, null, 2));
