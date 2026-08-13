import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readSource = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("athlete interface icon policy", () => {
  it("keeps questionnaire categories typographic instead of decorating every section", () => {
    const intro = readSource("src/components/questionnaire/QuestionnaireIntro.tsx");
    const categoryIntro = readSource("src/components/questionnaire/CategoryIntro.tsx");
    const progress = readSource("src/components/questionnaire/QuestionnaireProgress.tsx");
    const flow = readSource("src/components/questionnaire/QuestionnaireFlow.tsx");

    expect(intro).not.toContain("cat.icon");
    expect(categoryIntro).not.toContain("category.icon");
    expect(progress).not.toContain("categoryIcon");
    expect(flow).not.toContain("categoryIcon=");
  });

  it("uses functional status and navigation icons instead of decorative symbols in core input flows", () => {
    const intro = readSource("src/components/questionnaire/QuestionnaireIntro.tsx");
    const journal = readSource("src/pages/Journal.tsx");
    const assessment = readSource("src/pages/Assessment.tsx");
    const deepProfile = readSource("src/pages/DeepProfile.tsx");

    for (const decorativeIcon of ["Brain", "Clock", "HeartHandshake", "Save", "Sparkles"]) {
      expect(intro).not.toContain(`<${decorativeIcon}`);
    }
    expect(journal).not.toContain("<Heart");
    expect(journal).not.toContain("<Sparkles");
    expect(assessment).not.toContain("<ClipboardCheck");
    expect(deepProfile).not.toContain("<TrendingUp");

    expect(journal).toContain("<ArrowLeft");
    expect(journal).toContain("<ArrowRight");
    expect(journal).toContain("<Loader2");
    expect(journal).toContain("<Mic");
  });
});
