import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "src/components/admin/NlzPilotReadiness.tsx"),
  "utf8",
);

describe("NLZ admin data-mode contract", () => {
  it("starts fail-safe in production mode and filters teams by their test flag", () => {
    expect(source).toContain('useState<DataMode>("production")');
    expect(source).toContain('team.is_test_team === (dataMode === "qa")');
    expect(source).toContain('options.find((team) => !team.is_test_team)');
  });

  it("keeps QA read-only and outside standard snapshots and exports", () => {
    expect(source).toContain('dataMode === "production" ? (');
    expect(source).toContain('dataMode === "qa" ? (');
    expect(source).toContain("QA-Modus ist schreibgeschützt");
    expect(source).toContain("Keine Production-Snapshots oder Standardexporte");
    expect(source).toContain("<QaEvidenceParityPanel");
  });
});
