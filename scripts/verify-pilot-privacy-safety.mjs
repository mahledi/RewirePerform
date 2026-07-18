#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const files = {
  accountDeletion: read("supabase/migrations/20260714084351_account_deletion_self_service.sql"),
  app: read("src/App.tsx"),
  auth: read("src/pages/Auth.tsx"),
  bunLock: read("bun.lock"),
  consent: read("src/lib/dataContributionConsent.ts"),
  envExample: read(".env.example"),
  envValidation: read("scripts/validate-env.mjs"),
  errorBoundary: read("src/components/ErrorBoundary.tsx"),
  evidence: read("supabase/migrations/20260714224000_performance_evidence_56d_v1.sql"),
  main: read("src/main.tsx"),
  monitoring: read("src/lib/monitoring.ts"),
  minorGate: read("src/components/minor-consent/MinorAuthorizationGate.tsx"),
  minorMigration: read("supabase/migrations/20260718122735_minor_guardian_authorization_v1.sql"),
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
  files.teamMentalState.includes('"filter_data_contribution"') &&
  files.minorMigration.includes("IF _action = 'filter_data_contribution'") &&
  files.minorMigration.includes("pa.product_status = 'authorized'") &&
  files.minorMigration.includes("pa.data_contribution_status = 'authorized'");
const guardedAthleteWrites = [
  "questionnaire_responses",
  "daily_checkins",
  "daily_journals",
  "assessments",
  "deep_profile_assessments",
  "user_day_assignments",
  "user_day_completion",
  "comprehension_check_instances",
  "program_progress_snapshots",
  "athlete_transfer_observations",
  "calendar_events",
  "program_settings",
  "program_instances",
  "training_schedule",
  "push_subscriptions",
  "personalized_tasks",
];
const hasAgeAuthorizationState =
  files.minorMigration.includes("age_band text NOT NULL") &&
  files.minorMigration.includes("guardian_status text NOT NULL") &&
  files.minorMigration.includes("athlete_status text NOT NULL");
const hasProductWriteAgeGate =
  files.minorMigration.includes("CREATE OR REPLACE FUNCTION minor_auth.enforce_product_write()") &&
  guardedAthleteWrites.every((table) => files.minorMigration.includes(`('${table}', 'user_id')`));
const hasFrontendAuthorizationGate =
  files.minorGate.includes('status.product_status !== "authorized"') &&
  ["Questionnaire", "Dashboard", "Assessment", "DeepProfile", "Progress", "Journal", "JournalHistory", "PreTraining"]
    .every((page) => files.app.includes(`<MinorAuthorizationGate><${page} /></MinorAuthorizationGate>`));

verify(
  "release_gate",
  "G-02",
  "Athlete entry and product data writes enforce an age-appropriate authorization",
  hasAgeAuthorizationState && hasProductWriteAgeGate && hasFrontendAuthorizationGate,
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
  /Versandstatus/i.test(files.privacy) && /Öffnungszeitpunkt/i.test(files.privacy) && /Fehlerzeitpunkt/i.test(files.privacy),
);
verify(
  "release_gate",
  "G-05D",
  "Privacy text identifies the controller and a physical contact address",
  /Verantwortliche[rn]?/i.test(files.privacy) &&
    /Postanschrift/i.test(files.privacy) &&
    /Mahle Herzog/i.test(files.privacy) &&
    /Wiefeldick 16/i.test(files.privacy) &&
    /42699 Solingen/i.test(files.privacy) &&
    /hello@rewireperform\.com/i.test(files.privacy),
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
