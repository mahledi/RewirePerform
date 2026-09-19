import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("NLZ Data Lock export UI", () => {
  it("exports only an immutable run Data Lock from the pilot center", () => {
    const source = read("src/components/admin/NlzPilotReadiness.tsx");

    expect(source).toContain('rpc("create_evidence_data_lock"');
    expect(source).toContain("exportLockedDossier");
    expect(source).toContain("exportLockedCsvPackage");
    expect(source).toContain("evidenceLock.content_checksum");
    expect(source).toContain("setEvidenceLock(null)");
    expect(source).not.toContain("const exportDossier");
    expect(source).not.toContain("const exportPerformanceEvidence");
    expect(source).not.toContain('rpc("create_nlz_program_run_snapshot"');
  });

  it("requires both the development dossier and transfer evidence before locking", () => {
    const source = read("src/components/admin/NlzPilotReadiness.tsx");

    expect(source).toContain("disabled={!dossier || !performanceEvidence || action !== null}");
    expect(source).toContain("Spätere Änderungen erzeugen einen neuen Data Lock");
    expect(source).toContain("evidenceLock.evidence.schema_version");
  });

  it("exports solo evidence only from an immutable Data Lock", () => {
    const source = read("src/components/admin/EvidenceParticipationGate.tsx");

    expect(source).toContain('rpc("create_evidence_data_lock"');
    expect(source).toContain("createSoloEvidenceLock");
    expect(source).toContain("evidenceLock.content_checksum");
    expect(source).toContain("setEvidenceLock(null)");
    expect(source).toContain("Spätere Änderungen erzeugen einen neuen Data Lock");
    expect(source).not.toContain('rpc("get_performance_evidence_summary"');
    expect(source).not.toContain('rpc("get_solo_development_evidence_summary"');
  });

  it("keeps legacy admin metrics internal and routes every external export to Data Locks", () => {
    const source = read("src/pages/Admin.tsx");

    expect(source).toContain("Live-Daten dienen nur der internen Prüfung");
    expect(source).toContain('label: "Team-Export"');
    expect(source).toContain('label: "Solo-Export"');
    expect(source).toContain('<NlzPilotReadiness view="evidence" />');
    expect(source).toContain("<EvidenceParticipationGate />");
    expect(source).not.toContain("downloadCsv");
    expect(source).not.toContain("downloadJson");
    expect(source).not.toContain("downloadText");
    expect(source).not.toContain('rpc("create_study_aggregate_snapshot"');
    expect(source).not.toContain('rpc("create_nlz_evidence_snapshot"');
  });
});
