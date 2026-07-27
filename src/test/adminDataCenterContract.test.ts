import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("admin data center information architecture", () => {
  it("uses one top-level data and export area instead of duplicate evidence tabs", () => {
    const source = read("src/pages/Admin.tsx");

    expect(source).toContain('id: "evidence", title: "Daten & Exporte"');
    expect(source).toContain('{ id: "overview" as const, label: "Ergebnisse" }');
    expect(source).toContain('{ id: "portfolio" as const, label: "Gesamtdaten" }');
    expect(source).toContain('{ id: "team" as const, label: "Team-Export" }');
    expect(source).toContain('{ id: "solo" as const, label: "Solo-Export" }');
    expect(source).toContain('{ id: "comprehension" as const, label: "Programmverständnis" }');

    for (const removedTab of ["nlz", "presentation", "study", "exports"]) {
      expect(source).not.toContain(`<TabsContent value="${removedTab}"`);
    }
  });

  it("separates pilot operations from production evidence exports", () => {
    const adminSource = read("src/pages/Admin.tsx");
    const pilotSource = read("src/components/admin/NlzPilotReadiness.tsx");

    expect(adminSource).toContain('<NlzPilotReadiness view="operations" />');
    expect(adminSource).toContain('<NlzPilotReadiness view="evidence" />');
    expect(adminSource).toContain("<EvidenceParticipationGate />");
    expect(pilotSource).toContain('view?: "operations" | "evidence"');
    expect(pilotSource).toContain('view === "operations" && dataMode === "production"');
    expect(pilotSource).toContain('view === "evidence" ? (');
    expect(pilotSource).toContain("Production ohne QA");
  });
});
