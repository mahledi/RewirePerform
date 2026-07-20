import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ATHLETE_ASSENT_VERSION,
  GUARDIAN_DECISION_VERSION,
  GUARDIAN_NOTICE_VERSION,
  MINOR_DATA_CONTRIBUTION_VERSION,
  MINOR_POLICY_CONTENT_HASH,
  MINOR_POLICY_KEY,
  MINOR_PRODUCT_POLICY_VERSION,
  minorPolicyCanonicalDocument,
} from "@/content/minorPolicy";

const read = (path: string) => readFileSync(resolve(path), "utf8");
const baseMigration = () => read("supabase/migrations/20260718122735_minor_guardian_authorization_v1.sql");
const currentMigration = () => read("supabase/migrations/20260719085701_guardian_personalization_v2.sql");
const evidenceHardeningMigration = () => read("supabase/migrations/20260720080100_add_structured_solo_evidence_locks.sql");
const teamAggregateMigration = () => read("supabase/migrations/20260720082309_harden_team_mental_state_aggregate.sql");
const runEvidenceMigration = () => read("supabase/migrations/20260720090000_unify_program_run_evidence_eligibility.sql");

describe("minor guardian production contract", () => {
  it("pins the exact visible policy content to the database receipt hash", () => {
    const calculated = createHash("sha256")
      .update(JSON.stringify(minorPolicyCanonicalDocument))
      .digest("hex");
    const migration = currentMigration();

    expect(calculated).toBe(MINOR_POLICY_CONTENT_HASH);
    expect(migration).toContain(`'${MINOR_POLICY_KEY}'`);
    expect(migration).toContain(`'${MINOR_POLICY_CONTENT_HASH}'`);
  });

  it("keeps frontend, Edge Function and database policy versions aligned", () => {
    const edgeShared = read("supabase/functions/_shared/minorGuardian.ts");
    const migration = currentMigration();
    const versions = [
      MINOR_PRODUCT_POLICY_VERSION,
      GUARDIAN_NOTICE_VERSION,
      GUARDIAN_DECISION_VERSION,
      ATHLETE_ASSENT_VERSION,
      MINOR_DATA_CONTRIBUTION_VERSION,
    ];

    for (const version of versions) {
      expect(edgeShared).toContain(`"${version}"`);
      expect(migration).toContain(`'${version}'`);
    }
  });

  it("keeps private authorization tables inaccessible to app roles", () => {
    const migration = baseMigration();

    expect(migration).toContain("REVOKE ALL ON SCHEMA minor_auth FROM PUBLIC, anon, authenticated");
    expect(migration).toContain("REVOKE ALL ON ALL TABLES IN SCHEMA minor_auth FROM PUBLIC, anon, authenticated");
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION public.minor_service_action(text, uuid, jsonb) TO service_role");
    expect(migration).not.toContain("GRANT EXECUTE ON FUNCTION public.minor_service_action(text, uuid, jsonb) TO authenticated");
  });

  it("serializes protected writes with a concurrent authorization withdrawal", () => {
    const migration = baseMigration();

    expect(migration.match(/FOR SHARE OF pa;/gu)).toHaveLength(2);
    expect(migration).toContain("BEFORE INSERT OR UPDATE");
  });

  it("covers every current athlete program write surface", () => {
    const migration = baseMigration();
    const guardedTables = [
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

    for (const table of guardedTables) expect(migration).toContain(`('${table}', 'user_id')`);
    expect(migration).toContain("BEFORE UPDATE OF full_name, sport, team, position ON public.profiles");
  });

  it("filters team aggregates by current consent and authorization before n is evaluated", () => {
    const teamFunction = read("supabase/functions/team-mental-state/index.ts");
    const aggregate = teamAggregateMigration();
    const hardening = evidenceHardeningMigration();
    const authorizationGate = aggregate.indexOf("public.evidence_eligibility_reason(pi.id, _protocol_version)");
    const sensitiveSource = aggregate.indexOf("safe_checkins AS");

    expect(authorizationGate).toBeGreaterThan(0);
    expect(sensitiveSource).toBeGreaterThan(authorizationGate);
    expect(aggregate).toContain("IF eligible_count < 5 THEN");
    expect(aggregate).toContain("insufficient_authorized_data");
    expect(aggregate).toContain("individual_values_returned', false");
    expect(hardening).toContain("participant.data_contribution_athlete IS DISTINCT FROM true");
    expect(hardening).toContain("participant.data_contribution_guardian IS DISTINCT FROM true");
    expect(teamFunction).toContain('client.rpc("get_team_mental_state_aggregate"');
    expect(teamFunction).not.toContain('.from("daily_checkins")');
    expect(teamFunction).not.toContain("adminClient");
    expect(teamFunction).not.toContain('"Access-Control-Allow-Origin": "*"');
  });

  it("keeps operational participation independent from optional aggregate consent", () => {
    const aggregate = teamAggregateMigration();
    const operationalQuery = aggregate.indexOf("INTO active_last_7d");
    const consentQuery = aggregate.indexOf("INTO eligible_count");

    expect(operationalQuery).toBeGreaterThan(0);
    expect(operationalQuery).toBeLessThan(consentQuery);
    expect(aggregate).toContain("participation_rate := ROUND");
    expect(aggregate).toContain("'participation', jsonb_build_object('rate', participation_rate, 'total', active_last_7d)");
  });

  it("uses the same current authorization gate for coach and run dossier evidence", () => {
    const migration = runEvidenceMigration();
    const gate = migration.indexOf("public.evidence_eligibility_reason(pi.id, _protocol_version)");
    const checkinSource = migration.indexOf("checkins AS (");

    expect(gate).toBeGreaterThan(0);
    expect(checkinSource).toBeGreaterThan(gate);
    expect(migration).toContain("evidence := public.get_program_run_development_evidence(");
    expect(migration).toContain("'exclusion_reasons', CASE");
    expect(migration).toContain("'not_currently_authorized'");
    expect(migration).toContain("pr.status IN ('active', 'completed')");
  });

  it("requires exact age-appropriate receipts for minor evidence eligibility", () => {
    const base = baseMigration();
    const current = currentMigration();

    expect(base).toContain("Product contribution never grants transfer-evidence eligibility");
    expect(current).toContain("minor_guardian_assent_verified");
    expect(current).toContain("minor_self_assent_verified");
    expect(current).toContain("participant.data_contribution_guardian = true");
    expect(current).toContain("participant.data_contribution_athlete = true");
    expect(current).toContain("OR pi.status <> 'active'");
    expect(current).toContain("RETURN 'program_inactive'");
    expect(current).toContain("participant_policy.guardian_decision_version IS DISTINCT FROM target_protocol.required_guardian_consent_version");
    expect(current).toContain("participant_policy.athlete_assent_version IS DISTINCT FROM target_protocol.required_athlete_assent_version");
  });

  it("keeps a stored guardian decision successful when the receipt email fails", () => {
    const publicEdge = read("supabase/functions/minor-guardian-public/index.ts");
    const receiptCreated = publicEdge.indexOf("const receipt = guardianReceiptEmail(managementToken, firstName)");
    const emailDecrypted = publicEdge.indexOf("const email = await decryptEmail(");

    expect(receiptCreated).toBeGreaterThan(0);
    expect(emailDecrypted).toBeGreaterThan(receiptCreated);
    expect(publicEdge).toContain('receiptDelivery = "failed"');
    expect(publicEdge).toContain("manageUrl = receipt.manageUrl");
  });

  it("personalizes guardian contact without exposing an unsafe display name", () => {
    const edgeShared = read("supabase/functions/_shared/minorGuardian.ts");
    const guardianEmails = read("supabase/functions/_shared/guardianEmails.ts");
    const userEdge = read("supabase/functions/minor-guardian-user/index.ts");
    const publicEdge = read("supabase/functions/minor-guardian-public/index.ts");

    expect(edgeShared).toContain("safeAthleteFirstName");
    expect(guardianEmails).toContain("safeEmailHtml(athlete)");
    expect(guardianEmails).toContain("hat deine E-Mail-Adresse als Kontakt einer sorgeberechtigten Person angegeben");
    expect(userEdge).toContain("guardian-invitation-${challengeId}");
    expect(publicEdge).toContain("guardian-receipt-${tokenHash}");
    expect(edgeShared).toContain('"Idempotency-Key": idempotencyKey');
    expect(edgeShared).toContain("reply_to: SUPPORT_EMAIL");
  });

  it("keeps guardian secrets out of hosting query logs", () => {
    const guardianEmails = read("supabase/functions/_shared/guardianEmails.ts");

    expect(guardianEmails).toContain("/guardian/decision#token=");
    expect(guardianEmails).toContain("/guardian/decision#manage=");
    expect(guardianEmails).not.toContain("/guardian/decision?token=");
    expect(guardianEmails).not.toContain("/guardian/decision?manage=");
  });

  it("gates every athlete route that stores or reveals personal program data", () => {
    const app = read("src/App.tsx");
    const gatedPages = [
      "Questionnaire",
      "Dashboard",
      "Assessment",
      "DeepProfile",
      "Progress",
      "Journal",
      "JournalHistory",
      "PreTraining",
    ];

    for (const page of gatedPages) {
      expect(app).toContain(`<MinorAuthorizationGate><${page} /></MinorAuthorizationGate>`);
    }
    expect(app).toContain('path="/guardian/decision"');
    expect(app).toContain('path="/imprint"');
  });

  it("keeps the club outside the guardian process and excludes marketing", () => {
    const policy = JSON.stringify(minorPolicyCanonicalDocument);
    const edgeShared = read("supabase/functions/_shared/minorGuardian.ts");

    expect(policy).toContain("Der Verein ist an diesem Ablauf nicht beteiligt");
    expect(policy).toContain("nicht für Marketing verwendet");
    expect(edgeShared).not.toContain("newsletter");
  });

  it("includes the first guardian contact in the versioned policy receipt", () => {
    const policy = JSON.stringify(minorPolicyCanonicalDocument);
    const guardianEmails = read("supabase/functions/_shared/guardianEmails.ts");
    const emailShared = read("supabase/functions/_shared/rewireEmail.ts");

    expect(policy).toContain("guardianNotice");
    expect(policy).toContain("48 Stunden gültig");
    expect(policy).toContain("spätestens sieben Tage");
    expect(guardianEmails).toContain("48 Stunden gültig und nur einmal nutzbar");
    expect(guardianEmails).toContain("Wir fragen weder nach einem Passwort noch nach Zahlungsdaten");
    expect(emailShared).toContain('SUPPORT_EMAIL = "support@rewireperform.com"');
  });
});
