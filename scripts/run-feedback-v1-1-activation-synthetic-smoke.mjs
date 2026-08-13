#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const planPath = resolve(root, "docs/feedback-intelligence/contracts/production-activation-synthetic-smoke-v0.1/activation-smoke-plan.json");
const legalReferenceIndex = process.argv.indexOf("--legal-reference");
const legalReference = legalReferenceIndex >= 0 ? process.argv[legalReferenceIndex + 1] : null;
const qualified = typeof legalReference === "string"
  && /^legal-review-de-feedback-v1\.1:[A-Za-z0-9][A-Za-z0-9._/-]{15,159}$/u.test(legalReference)
  && !/(draft|pending|unreviewed|synthetic|test|fixture)/iu.test(legalReference);

if (!qualified) throw new Error("qualified legal-review reference required before any activation operation");

const plan = JSON.parse(readFileSync(planPath, "utf8"));
if (Object.values(plan.external_gates).some((value) => value !== false)) {
  throw new Error("activation smoke contract external-gate drift");
}

throw new Error(
  "local contract validation only: Production activation/synthetic smoke requires separate explicit approval and an audited credentialed operator",
);
