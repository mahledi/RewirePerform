import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve("supabase/migrations/20260824132500_feedback_invitation_resume_fix.sql"),
  "utf8",
);

describe("feedback invitation resume migration", () => {
  it("keeps only an open invitation eligible across repeated claims", () => {
    expect(migration).toContain("existing_state.state <> 'invited'");
    expect(migration).toContain("existing_state.id IS NULL");
    expect(migration).toContain("'already_' || existing_state.state");
    expect(migration).toContain("'mode', CASE WHEN existing_submission.id IS NULL THEN 'invitation' ELSE 'resume' END");
  });

  it("preserves the existing policy, program, campaign, and text-consent gates", () => {
    expect(migration).toContain("feedback_core.rollout_ready()");
    expect(migration).toContain("minor_auth.enforcement_enabled()");
    expect(migration).toContain("feedback_core.actor_context(actor_id)");
    expect(migration).toContain("instance.status = 'active'");
    expect(migration).toContain("campaign.status = 'active'");
    expect(migration).toContain("feedback_core.jurisdiction_policy_ready");
    expect(migration).toContain("feedback_consent.guardian_text_authorizations");
  });
});
