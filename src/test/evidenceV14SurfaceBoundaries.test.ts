import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("V1.4 evidence surface boundaries", () => {
  it("keeps the four-surface preview behind the existing internal preview gate", () => {
    const app = read("src/App.tsx");
    expect(app).toContain("const EvidenceV14Preview = evidencePreviewEnabled");
    expect(app).toContain('/internal/evidence-v1-4-preview');
    expect(app).not.toContain('<Route path="/evidence-v1-4"');
  });

  it("gives the coach surface aggregate rows only", () => {
    const coach = read("src/components/evidence-v14/CoachTeamDevelopment.tsx");
    expect(coach).toContain("CoachAggregateRow[]");
    expect(coach).not.toContain("subjectRef");
    expect(coach).not.toContain("normalizedScore");
    expect(coach).not.toContain("freeText");
  });

  it("does not introduce raw answers, identity fields or causal claims into surface models", () => {
    const models = read("src/components/evidence-v14/models.ts");
    expect(models).not.toMatch(/\b(name|email|answer|journal|freeText|userId)\??:/);
    expect(models).toContain("causalClaimAllowed: false");
  });

  it("labels the preview as synthetic and inactive", () => {
    const preview = read("src/pages/EvidenceV14Preview.tsx");
    expect(preview).toContain("Lokale synthetische Vorschau");
    expect(preview).toContain("liest keine echten Spielerdaten");
  });
});
