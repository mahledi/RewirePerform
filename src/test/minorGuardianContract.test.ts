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

describe("minor guardian production contract", () => {
  it("pins the exact visible policy content to the database receipt hash", () => {
    const calculated = createHash("sha256")
      .update(JSON.stringify(minorPolicyCanonicalDocument))
      .digest("hex");
    const migration = read("supabase/migrations/20260718122735_minor_guardian_authorization_v1.sql");

    expect(calculated).toBe(MINOR_POLICY_CONTENT_HASH);
    expect(migration).toContain(`'${MINOR_POLICY_KEY}'`);
    expect(migration).toContain(`'${MINOR_POLICY_CONTENT_HASH}'`);
  });

  it("keeps frontend, Edge Function and database policy versions aligned", () => {
    const edgeShared = read("supabase/functions/_shared/minorGuardian.ts");
    const migration = read("supabase/migrations/20260718122735_minor_guardian_authorization_v1.sql");
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
    const migration = read("supabase/migrations/20260718122735_minor_guardian_authorization_v1.sql");

    expect(migration).toContain("REVOKE ALL ON SCHEMA minor_auth FROM PUBLIC, anon, authenticated");
    expect(migration).toContain("REVOKE ALL ON ALL TABLES IN SCHEMA minor_auth FROM PUBLIC, anon, authenticated");
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION public.minor_service_action(text, uuid, jsonb) TO service_role");
    expect(migration).not.toContain("GRANT EXECUTE ON FUNCTION public.minor_service_action(text, uuid, jsonb) TO authenticated");
  });

  it("serializes protected writes with a concurrent authorization withdrawal", () => {
    const migration = read("supabase/migrations/20260718122735_minor_guardian_authorization_v1.sql");

    expect(migration.match(/FOR SHARE OF pa;/gu)).toHaveLength(2);
    expect(migration).toContain("BEFORE INSERT OR UPDATE");
  });

  it("covers every current athlete program write surface", () => {
    const migration = read("supabase/migrations/20260718122735_minor_guardian_authorization_v1.sql");
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
    const consentQuery = teamFunction.indexOf('.eq("data_contribution_consent", true)');
    const rolloutCheck = teamFunction.indexOf('"enforcement_preflight"');
    const authorizationFilter = teamFunction.indexOf('"filter_data_contribution"');
    const sensitiveQuery = teamFunction.indexOf('.select("user_id, date, energy_level');

    expect(consentQuery).toBeGreaterThan(0);
    expect(rolloutCheck).toBeGreaterThan(consentQuery);
    expect(authorizationFilter).toBeGreaterThan(rolloutCheck);
    expect(sensitiveQuery).toBeGreaterThan(authorizationFilter);
    expect(teamFunction).toContain("if (enforcementEnabled)");
    expect(teamFunction).toContain("insufficient_authorized_data");
    expect(teamFunction).not.toContain("consent_below_min_n");
    expect(teamFunction).not.toContain("authorization_below_min_n");
    expect(teamFunction).not.toContain('"Access-Control-Allow-Origin": "*"');
  });

  it("keeps operational participation independent from optional aggregate consent", () => {
    const teamFunction = read("supabase/functions/team-mental-state/index.ts");
    const operationalQuery = teamFunction.indexOf('.select("user_id, date")');
    const consentQuery = teamFunction.indexOf('.eq("data_contribution_consent", true)');

    expect(operationalQuery).toBeGreaterThan(0);
    expect(operationalQuery).toBeLessThan(consentQuery);
    expect(teamFunction).toContain('.in("user_id", initiallyAssignedIds)');
    expect(teamFunction).toContain("rate: Math.round((activeAthletes / initiallyAssignedIds.length) * 100)");
    expect(teamFunction).toContain("participation: operationalParticipation");
  });

  it("never turns an in-app age declaration into transfer-evidence eligibility", () => {
    const migration = read("supabase/migrations/20260718122735_minor_guardian_authorization_v1.sql");

    expect(migration).not.toContain("adult_status_confirmed_outside_app");
    expect(migration).toContain("Product contribution never grants transfer-evidence eligibility");
  });

  it("keeps a stored guardian decision successful when the receipt email fails", () => {
    const publicEdge = read("supabase/functions/minor-guardian-public/index.ts");
    const receiptCreated = publicEdge.indexOf("const receipt = guardianReceiptEmail(managementToken)");
    const emailDecrypted = publicEdge.indexOf("const email = await decryptEmail(");

    expect(receiptCreated).toBeGreaterThan(0);
    expect(emailDecrypted).toBeGreaterThan(receiptCreated);
    expect(publicEdge).toContain('receiptDelivery = "failed"');
    expect(publicEdge).toContain("manageUrl = receipt.manageUrl");
  });

  it("keeps guardian secrets out of hosting query logs", () => {
    const edgeShared = read("supabase/functions/_shared/minorGuardian.ts");

    expect(edgeShared).toContain("/guardian/decision#token=");
    expect(edgeShared).toContain("/guardian/decision#manage=");
    expect(edgeShared).not.toContain("/guardian/decision?token=");
    expect(edgeShared).not.toContain("/guardian/decision?manage=");
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
    expect(edgeShared).toContain("nicht für Marketing verwendet");
    expect(edgeShared).not.toContain("newsletter");
  });

  it("includes the first guardian contact in the versioned policy receipt", () => {
    const policy = JSON.stringify(minorPolicyCanonicalDocument);
    const edgeShared = read("supabase/functions/_shared/minorGuardian.ts");

    expect(policy).toContain("guardianNotice");
    expect(policy).toContain("48 Stunden gültig");
    expect(policy).toContain("spätestens sieben Tage");
    expect(edgeShared).toContain("48 Stunden gültig und nur einmal nutzbar");
    expect(edgeShared).toContain("Die verschlüsselte Kopie der Adresse wird im RewirePerform-Autorisierungssystem spätestens sieben Tage");
  });
});
