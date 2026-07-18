#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const files = {
  accountDeletion: read("supabase/migrations/20260714084351_account_deletion_self_service.sql"),
  auth: read("src/pages/Auth.tsx"),
  bunLock: read("bun.lock"),
  consent: read("src/lib/dataContributionConsent.ts"),
  envExample: read(".env.example"),
  envValidation: read("scripts/validate-env.mjs"),
  errorBoundary: read("src/components/ErrorBoundary.tsx"),
  evidence: read("supabase/migrations/20260714224000_performance_evidence_56d_v1.sql"),
  main: read("src/main.tsx"),
  monitoring: read("src/lib/monitoring.ts"),
  packageJson: read("package.json"),
  packageLock: read("package-lock.json"),
  privacy: read("src/pages/Privacy.tsx"),
  questionnaireAi: read("supabase/functions/analyze-questionnaire/index.ts"),
  summaryAi: read("supabase/functions/generate-transformation-summary/index.ts"),
  teamMentalState: read("supabase/functions/team-mental-state/index.ts"),
  viteEnv: read("src/vite-env.d.ts"),
};

const results = [];
const verify = (kind, id, description, condition) => {
  results.push({ kind, id, description, passed: Boolean(condition) });
};

const consentVersion = files.consent.match(
  /DATA_CONTRIBUTION_CONSENT_VERSION\s*=\s*["']([^"']+)["']/,
)?.[1];
const protocolConsentVersion = files.evidence.match(
  /VALUES\s*\(\s*'56d-transfer-v1-2026-07'\s*,\s*'pilot'\s*,\s*56\s*,\s*'([^']+)'/,
)?.[1];

verify(
  "invariant",
  "I-01",
  "Frontend consent version matches the active evidence protocol",
  consentVersion && consentVersion === protocolConsentVersion,
);
verify(
  "invariant",
  "I-02",
  "The active evidence protocol keeps minor collection disabled with no approved receipt versions",
  /'56d-transfer-v1-2026-07'[\s\S]{0,300}true,\s*true,\s*false,\s*NULL,\s*NULL/.test(
    files.evidence,
  ),
);
verify(
  "invariant",
  "I-03",
  "Evidence eligibility fails closed while minor collection is disabled",
  files.evidence.includes("IF NOT target_protocol.minor_collection_enabled") &&
    files.evidence.includes("RETURN 'minor_participation_not_enabled'"),
);
verify(
  "invariant",
  "I-04",
  "Team psychological aggregates enforce n >= 5 and do not select reflection text",
  /const MIN_N = 5;/.test(files.teamMentalState) &&
    !/\.select\([\s\S]{0,350}\breflection\b[\s\S]{0,80}\)/.test(files.teamMentalState),
);
verify(
  "invariant",
  "I-05",
  "The shipped app has no Sentry SDK, DSN or runtime capture path",
  ![
    files.bunLock,
    files.envExample,
    files.envValidation,
    files.errorBoundary,
    files.main,
    files.monitoring,
    files.packageJson,
    files.packageLock,
    files.viteEnv,
  ].some((source) => /@sentry\/|VITE_SENTRY|ingest\.de\.sentry\.io|initMonitoring|setMonitoringUser/.test(source)) &&
    files.monitoring.includes('supabase.from("app_event_log").insert') &&
    files.monitoring.includes("sanitizeMonitoringMetadata(metadata)") &&
    !files.errorBoundary.includes("componentStack"),
);
verify(
  "invariant",
  "I-06",
  "Former questionnaire and transformation AI functions remain disabled",
  files.questionnaireAi.includes("status: 410") && files.summaryAi.includes("status: 410"),
);
verify(
  "invariant",
  "I-07",
  "Account deletion removes journals, check-ins, diagnostics and notification logs",
  [
    "DELETE FROM public.daily_journals",
    "DELETE FROM public.daily_checkins",
    "DELETE FROM public.app_event_log",
    "DELETE FROM public.notification_log",
  ].every((statement) => files.accountDeletion.includes(statement)),
);

const hasTeamConsentFilter =
  files.teamMentalState.includes("data_contribution_consent") &&
  files.teamMentalState.includes("data_contribution_consent_version");
const hasTeamAgeGate =
  files.teamMentalState.includes("evidence_eligibility_reason") ||
  files.teamMentalState.includes("participant_authorization");
const hasSignupAgeGate = /age_band|participant_category|guardian/i.test(files.auth);
const hasConsentWriteAgeGate = /age_band|guardian|participant_authorization/i.test(files.consent);

verify(
  "release_gate",
  "G-02",
  "Signup and product data writes enforce an age-appropriate authorization",
  hasSignupAgeGate && hasConsentWriteAgeGate,
);
verify(
  "release_gate",
  "G-03",
  "team-mental-state filters both current consent and age eligibility before n >= 5",
  hasTeamConsentFilter && hasTeamAgeGate,
);
verify(
  "release_gate",
  "G-05A",
  "Privacy text does not claim active AI-generated tasks",
  !/AI-generierte Aufgaben/i.test(files.privacy),
);
verify(
  "release_gate",
  "G-05B",
  "Privacy text names the active infrastructure processors",
  ["Supabase", "Vercel"].every((provider) => files.privacy.includes(provider)),
);
verify(
  "release_gate",
  "G-05C",
  "Privacy text discloses notification delivery, open and failure logging",
  /notification_log|Versandstatus/i.test(files.privacy) && /Oeffnung|Öffnung/i.test(files.privacy),
);
verify(
  "release_gate",
  "G-05D",
  "Privacy text identifies the controller and a physical contact address",
  /Verantwortliche[rn]?/i.test(files.privacy) && /Postanschrift|Anschrift/i.test(files.privacy),
);
verify(
  "release_gate",
  "G-05E",
  "Published privacy text is not marked as awaiting final legal review",
  !/vor App-Store-Veröffentlichung[^.]*juristisch final geprüft/i.test(files.privacy),
);

for (const result of results) {
  const marker = result.passed ? "PASS" : result.kind === "invariant" ? "FAIL" : "BLOCKED";
  console.log(`${marker} ${result.id} ${result.description}`);
}

const failedInvariants = results.filter((result) => result.kind === "invariant" && !result.passed);
const blockedReleaseGates = results.filter((result) => result.kind === "release_gate" && !result.passed);

console.log("");
console.log(
  `Privacy safety result: ${results.length - failedInvariants.length - blockedReleaseGates.length}/${results.length} checks ready; ` +
    `${failedInvariants.length} invariant failure(s); ${blockedReleaseGates.length} release blocker(s).`,
);

if (failedInvariants.length > 0 || blockedReleaseGates.length > 0) {
  process.exitCode = 1;
}
