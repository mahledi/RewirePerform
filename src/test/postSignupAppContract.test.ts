import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("post-signup app contract", () => {
  it("keeps minor authorization before the athlete introduction and questionnaire", () => {
    const app = read("src/App.tsx");
    const questionnaireRoute = app.slice(
      app.indexOf('<Route path="/questionnaire"'),
      app.indexOf('<Route path="/dashboard"'),
    );

    expect(questionnaireRoute.indexOf("MinorAuthorizationGate")).toBeLessThan(
      questionnaireRoute.indexOf("PostSignupOnboardingGate"),
    );
    expect(questionnaireRoute.indexOf("PostSignupOnboardingGate")).toBeLessThan(
      questionnaireRoute.indexOf("<Questionnaire />"),
    );
  });

  it("cannot bypass a pending introduction through another athlete product route", () => {
    const app = read("src/App.tsx");
    for (const page of [
      "Questionnaire",
      "Dashboard",
      "Assessment",
      "DeepProfile",
      "Progress",
      "Journal",
      "JournalHistory",
      "PreTraining",
    ]) {
      const pageIndex = app.indexOf(`<${page} />`);
      const routeStart = app.lastIndexOf("<Route", pageIndex);
      const route = app.slice(routeStart, pageIndex + `<${page} />`.length);
      expect(route).toContain("MinorAuthorizationGate");
      expect(route).toContain("PostSignupOnboardingGate");
    }
  });

  it("opens native first launch on the role-first introduction before authentication", () => {
    const app = read("src/App.tsx");
    const index = read("src/pages/Index.tsx");

    expect(app).toContain('<Route path="/auth" element={<Auth />} />');
    expect(app).not.toContain("PublicOnboardingGate");
    expect(app).toContain('<Route path="/start" element={<FirstRunRoleEntry />} />');
    expect(app).toContain('<Route path="/start/athlete" element={<AthleteFirstRunEntry />} />');
    expect(app).toContain('<Route path="/start/coach" element={<CoachFirstRunEntry />} />');
    expect(index).toContain('navigate("/start", { replace: true })');
    expect(index).not.toContain('navigate("/welcome"');
  });

  it("marks only genuine signup continuations and keeps password login marker-free", () => {
    const auth = read("src/pages/Auth.tsx");
    const loginBlock = auth.slice(
      auth.indexOf("const handleLogin"),
      auth.indexOf("const handleSignup"),
    );
    const signupBlock = auth.slice(
      auth.indexOf("const handleSignup"),
      auth.indexOf("const resendConfirmation"),
    );

    expect(loginBlock).not.toContain("beginPostSignupOnboarding");
    expect(signupBlock).toContain("beginPostSignupOnboarding(data.user.id, intent)");
  });
});
