#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const files = {
  accountDeletion: read("supabase/migrations/20260714084351_account_deletion_self_service.sql"),
  admin: read("src/pages/Admin.tsx"),
  app: read("src/App.tsx"),
  auth: read("src/pages/Auth.tsx"),
  bunLock: read("bun.lock"),
  consent: read("src/lib/dataContributionConsent.ts"),
  contact: read("src/config/contact.ts"),
  envExample: read(".env.example"),
  envValidation: read("scripts/validate-env.mjs"),
  errorBoundary: read("src/components/ErrorBoundary.tsx"),
  evidence: read("supabase/migrations/20260714224000_performance_evidence_56d_v1.sql"),
  evidenceMinorUpgrade: read("supabase/migrations/20260719085701_guardian_personalization_v2.sql"),
  evidenceHardening: read("supabase/migrations/20260720080100_add_structured_solo_evidence_locks.sql"),
  evidenceParticipationGate: read("src/components/admin/EvidenceParticipationGate.tsx"),
  main: read("src/main.tsx"),
  monitoring: read("src/lib/monitoring.ts"),
  nlzPilotReadiness: read("src/components/admin/NlzPilotReadiness.tsx"),
  minorGate: read("src/components/minor-consent/MinorAuthorizationGate.tsx"),
  minorMigration: read("supabase/migrations/20260718122735_minor_guardian_authorization_v1.sql"),
  packageJson: read("package.json"),
  packageLock: read("package-lock.json"),
  privacy: read("src/pages/Privacy.tsx"),
  questionnaireAi: read("supabase/functions/analyze-questionnaire/index.ts"),
  runEvidence: read("supabase/migrations/20260720090000_unify_program_run_evidence_eligibility.sql"),
  summaryAi: read("supabase/functions/generate-transformation-summary/index.ts"),
  teamMentalState: read("supabase/functions/team-mental-state/index.ts"),
  teamMentalStateAggregate: read("supabase/migrations/20260720082309_harden_team_mental_state_aggregate.sql"),
  viteEnv: read("src/vite-env.d.ts"),
};

const results = [];
const verify = (kind, id, description, condition) => {
  results.push({ kind, id, description, passed: Boolean(condition) });
};

const consentVersion = files.consent.match(
  /DATA_CONTRIBUTION_CONSENT_VERSION\s*=\s*["']([^"']+)["']/,
)?.[1];
const protocolConsentVersion = files.evidenceMinorUpgrade.match(
  /VALUES\s*\(\s*'56d-transfer-v2-2026-07'\s*,\s*'pilot'\s*,\s*56\s*,\s*'([^']+)'/,
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
  "The active evidence protocol enables minors only with exact guardian and athlete receipt versions",
  /'56d-transfer-v2-2026-07'[\s\S]{0,300}true,\s*true,\s*true,\s*'guardian_decision_v2_2026_07',\s*'athlete_assent_v2_2026_07'/.test(
    files.evidenceMinorUpgrade,
  ),
);
verify(
  "invariant",
  "I-03",
  "Minor evidence eligibility fails closed without current dual authorization",
  files.evidenceMinorUpgrade.includes("IF NOT target_protocol.minor_collection_enabled") &&
    files.evidenceMinorUpgrade.includes("participant.data_contribution_athlete IS DISTINCT FROM true") &&
    files.evidenceMinorUpgrade.includes("participant.data_contribution_guardian IS DISTINCT FROM true") &&
    files.evidenceMinorUpgrade.includes("participant_policy.guardian_decision_version IS DISTINCT FROM target_protocol.required_guardian_consent_version") &&
    files.evidenceMinorUpgrade.includes("participant_policy.athlete_assent_version IS DISTINCT FROM target_protocol.required_athlete_assent_version"),
);
verify(
  "invariant",
  "I-04",
  "Team psychological aggregates enforce n >= 5 and do not select reflection text",
  files.teamMentalState.includes('client.rpc("get_team_mental_state_aggregate"') &&
    files.teamMentalStateAggregate.includes("ds.mood_n >= 5") &&
    files.teamMentalStateAggregate.includes("ds.stress_n >= 5") &&
    files.teamMentalStateAggregate.includes("ws.energy_n >= 5") &&
    files.teamMentalStateAggregate.includes("GROUP BY scr.user_id, scr.date") &&
    files.teamMentalStateAggregate.includes("GROUP BY wp.week_offset, wp.start_date, wp.label, sc.user_id") &&
    !files.teamMentalState.includes('.from("daily_checkins")') &&
    !files.teamMentalStateAggregate.includes("dc.reflection"),
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
verify(
  "invariant",
  "I-08",
  "Coach and run dossier evidence share the current consent and age authorization gate",
  files.runEvidence.includes("public.evidence_eligibility_reason(pi.id, _protocol_version)") &&
    files.runEvidence.includes("evidence := public.get_program_run_development_evidence(") &&
    files.runEvidence.includes("'mood', CASE WHEN ds.mood_n >= 5 THEN ds.mood END") &&
    files.runEvidence.includes("'not_currently_authorized'") &&
    !files.runEvidence.includes("jsonb_object_agg(er.eligibility_reason"),
);
verify(
  "invariant",
  "I-09",
  "Solo development and transfer evidence share the current authorization gate and n >= 5 suppression",
  files.runEvidence.includes("CREATE OR REPLACE FUNCTION public.get_solo_development_evidence_summary") &&
    files.runEvidence.includes("public.evidence_eligibility_reason(pi.id, _protocol_version)") &&
    files.runEvidence.includes("CASE WHEN c.participants_with_snapshot >= 5 THEN c.avg_completion_rate END") &&
    files.runEvidence.includes("'solo-sport-evidence-lock-v2-2026-07'") &&
    files.runEvidence.includes("'transfer_evidence', transfer_evidence"),
);
verify(
  "invariant",
  "I-10",
  "Admin evidence leaves the app only through immutable Team or Solo Data Locks",
  files.nlzPilotReadiness.includes('rpc("create_evidence_data_lock"') &&
    files.evidenceParticipationGate.includes('rpc("create_evidence_data_lock"') &&
    !files.evidenceParticipationGate.includes('rpc("get_performance_evidence_summary"') &&
    !files.admin.includes("downloadCsv") &&
    !files.admin.includes("downloadJson") &&
    !files.admin.includes("downloadText") &&
    !files.admin.includes('rpc("create_study_aggregate_snapshot"') &&
    !files.admin.includes('rpc("create_nlz_evidence_snapshot"'),
);
verify(
  "invariant",
  "I-11",
  "Legacy snapshot builders cannot bypass the current Data Lock eligibility contract",
  [
    "public.create_study_aggregate_snapshot(uuid,boolean)",
    "public.create_nlz_evidence_snapshot(uuid,boolean)",
    "public.create_nlz_program_run_snapshot(uuid)",
  ].every((signature) => files.runEvidence.includes(signature)) &&
    files.runEvidence.includes("FROM PUBLIC, anon, authenticated"),
);
verify(
  "invariant",
  "I-12",
  "Production and QA evidence use mutually exclusive participant and observation scopes",
  [files.evidenceHardening, files.runEvidence].every((source) =>
    source.includes("COALESCE(p.is_test_user, false)") &&
    source.includes("COALESCE(pi.is_test_instance, false)") &&
    source.includes("'data_mode', CASE WHEN _include_test THEN 'qa_only' ELSE 'production_only' END")) &&
    files.evidenceHardening.includes("COALESCE(ato.is_test, false) = _include_test") &&
    files.runEvidence.includes("RAISE EXCEPTION 'program_run_data_mode_contamination'") &&
    files.runEvidence.includes("RAISE EXCEPTION 'evidence_data_mode_mismatch'"),
);

const hasTeamConsentFilter =
  files.teamMentalStateAggregate.includes("public.evidence_eligibility_reason(pi.id, _protocol_version)") &&
  files.evidenceHardening.includes("target_profile.data_contribution_consent_version IS DISTINCT FROM target_protocol.required_consent_version");
const hasTeamAgeGate =
  files.evidenceHardening.includes("participant.data_contribution_athlete IS DISTINCT FROM true") &&
  files.evidenceHardening.includes("participant.data_contribution_guardian IS DISTINCT FROM true") &&
  files.evidenceHardening.includes("participant_policy.athlete_assent_version IS DISTINCT FROM target_protocol.required_athlete_assent_version");
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
    files.privacy.includes("SUPPORT_EMAIL") &&
    /SUPPORT_EMAIL\s*=\s*["']support@rewireperform\.com["']/i.test(files.contact),
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
