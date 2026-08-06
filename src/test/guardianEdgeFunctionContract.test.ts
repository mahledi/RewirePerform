import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

const config = read("supabase/config.toml");
const userFunction = read("supabase/functions/minor-guardian-user/index.ts");
const publicFunction = read("supabase/functions/minor-guardian-public/index.ts");
const shared = read("supabase/functions/_shared/minorGuardian.ts");

describe("guardian Edge Function contract", () => {
  it("keeps the athlete endpoint JWT protected and the token endpoint self-authenticated", () => {
    expect(config).toMatch(/\[functions\.minor-guardian-user\]\s+verify_jwt = true/u);
    expect(config).toMatch(/\[functions\.minor-guardian-public\]\s+verify_jwt = false/u);
    expect(userFunction).toContain("authenticatedUser(req)");
    expect(shared).toContain("client.auth.getUser(token)");
  });

  it("hashes public link secrets before every guardian lookup", () => {
    expect(publicFunction).toContain("const tokenHash = await sha256(token)");
    expect(publicFunction).toContain("{ token_hash: tokenHash }");
    expect(publicFunction).toContain("{ _token_hash: tokenHash }");
    expect(publicFunction).not.toContain("console.");
  });

  it("requires an explicit guardian declaration and feedback-text decision", () => {
    expect(publicFunction).toContain('typeof body.guardianFeedbackTextAuthorized !== "boolean"');
    expect(publicFunction).toContain("body.guardianDeclaration !== true");
    expect(publicFunction).toContain("feedback_text_authorized: body.guardianFeedbackTextAuthorized");
    expect(publicFunction).toContain("guardian_declaration: true");
  });

  it("limits feedback-text access to the four bounded Guardian RPCs", () => {
    for (const functionName of [
      "guardian_feedback_text_decision_status",
      "guardian_feedback_text_decide",
      "guardian_feedback_text_management_status",
      "guardian_feedback_text_management_decide",
    ]) {
      expect(publicFunction).toContain(functionName);
      expect(shared).toContain(functionName);
    }
    expect(publicFunction).not.toContain('.from("feedback_raw')
    expect(publicFunction).not.toContain('.from("feedback_consent')
  });

  it("keeps origin, body-size and pinned dependency safeguards in shared code", () => {
    expect(shared).toContain("assertAllowedOrigin");
    expect(shared).toContain("if (raw.length > 8_192)");
    expect(shared).toContain("npm:@supabase/supabase-js@2.99.3");
    expect(shared).toContain('"Cache-Control": "no-store"');
  });
});
