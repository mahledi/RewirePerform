import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readRepoFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

const migration = readRepoFile(
  "supabase/migrations/20260714084351_account_deletion_self_service.sql",
);
const edgeFunction = readRepoFile("supabase/functions/delete-account/index.ts");
const accountDeletedPage = readRepoFile("src/pages/AccountDeleted.tsx");
const privacyPage = readRepoFile("src/pages/Privacy.tsx");
const profileSchema = readRepoFile(
  "supabase/migrations/20260323043306_a44936e8-0534-4bce-ba41-6d9879daaa4b.sql",
);

const personalTables = [
  "assessments",
  "app_event_log",
  "calendar_events",
  "coach_journals",
  "comprehension_check_instances",
  "daily_checkins",
  "daily_journals",
  "deep_profile_assessments",
  "feedback",
  "notification_log",
  "personalized_tasks",
  "program_instances",
  "program_progress_snapshots",
  "program_settings",
  "push_subscriptions",
  "qa_time_overrides",
  "questionnaire_responses",
  "study_participants",
  "team_members",
  "training_schedule",
  "user_day_assignments",
  "user_day_completion",
  "user_roles",
] as const;

const legacySessionTables = [
  "assessments",
  "calendar_events",
  "daily_checkins",
  "deep_profile_assessments",
  "personalized_tasks",
  "program_settings",
  "questionnaire_responses",
] as const;

describe("account deletion contract", () => {
  it("keeps the request table service-only and runs cleanup before Auth deletion", () => {
    expect(migration).toContain(
      "REVOKE ALL ON TABLE public.account_deletion_requests FROM PUBLIC, anon, authenticated;",
    );
    expect(migration).toContain(
      "GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.account_deletion_requests TO service_role;",
    );
    expect(migration).toContain("SECURITY DEFINER");
    expect(migration).toContain("SET search_path = ''");
    expect(migration).toContain("BEFORE DELETE ON auth.users");
  });

  it("requires a valid co-coach transfer for every owned team", () => {
    expect(migration).toContain("WHERE created_by = OLD.id");
    expect(migration).toContain("deletion_request.transfer_plan ->> owned_team.id::text");
    expect(migration).toContain("ur.role = 'coach'::public.app_role");
    expect(migration).toContain("tm.team_id = owned_team.id");
    expect(migration).toContain("FOR KEY SHARE OF tm, ur");
    expect(migration).toContain("SET created_by = successor_id");
  });

  it.each(personalTables)("deletes personal source rows from %s", (table) => {
    expect(migration).toMatch(new RegExp(`DELETE FROM public\\.${table}\\b`));
  });

  it.each(legacySessionTables)("also deletes legacy %s rows by session id", (table) => {
    expect(migration).toMatch(
      new RegExp(
        `DELETE FROM public\\.${table}\\s+WHERE user_id = OLD\\.id OR session_id = OLD\\.id::text`,
        "m",
      ),
    );
  });

  it("deletes the profile through the Auth foreign-key cascade", () => {
    expect(profileSchema).toContain(
      "id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE",
    );
  });

  it("retains only de-identified evidence snapshots and neutralizes operator references", () => {
    for (const table of ["study_aggregate_snapshots", "study_evidence_snapshots"]) {
      expect(migration).not.toMatch(new RegExp(`DELETE FROM public\\.${table}\\b`));
      expect(migration).toMatch(
        new RegExp(`UPDATE public\\.${table}\\s+SET generated_by = NULL`, "m"),
      );
    }
    expect(migration).toMatch(/DELETE FROM public\.app_event_log WHERE user_id = OLD\.id/);
  });

  it("authenticates the caller, enforces recent auth, revokes sessions, and hard-deletes", () => {
    expect(edgeFunction).toContain("authClient.auth.getUser(token)");
    expect(edgeFunction).toContain("isRecentlyAuthenticated(token)");
    expect(edgeFunction).toContain('admin.auth.admin.signOut(token, "global")');
    expect(edgeFunction).toContain("admin.auth.admin.deleteUser(user.id, false)");
    expect(edgeFunction).toContain("validateTransfers(ownedTeams, body.transfers)");
    expect(edgeFunction).toContain("getProgramInstanceIds(admin, user.id)");
    expect(edgeFunction).toContain("const validatedPlan: TransferPlan = {}");
    expect(edgeFunction).toContain("if (signOutError)");
  });

  it("does not accept or forward a password", () => {
    expect(edgeFunction).not.toMatch(/password/i);
  });

  it("does not promise unconfigured automatic backup deletion", () => {
    expect(accountDeletedPage).not.toMatch(/höchstens 30 Tagen automatisch/);
    expect(privacyPage).not.toMatch(/höchstens 30 Tagen automatisch/);
    expect(privacyPage).toContain("Sicherungskopien oder Sicherheitsprotokollen");
    expect(privacyPage).toContain("für Produkt- oder Analysezwecke gesperrt");
  });
});
