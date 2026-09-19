import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) =>
  readFileSync(resolve(process.cwd(), file), "utf8");

const privacy = read("src/pages/Privacy.tsx");
const checklist = read("docs/app-store-privacy-checklist.md");
const retention = read("docs/RETENTION_AND_DELETION_DECISION_2026-07-15.md");

describe("privacy retention contract", () => {
  it("keeps active deletion, own exports and provider retention distinct", () => {
    expect(privacy).toContain("direkt aus dem aktiven System entfernt");
    expect(privacy).toContain("spätestens sieben Kalendertage nach seiner Erstellung gelöscht");
    expect(privacy).toContain("Rückgabefrist von 30 Tagen");
    expect(privacy).not.toMatch(
      /providerseitigen[\s\S]{0,250}spätestens innerhalb von sieben Kalendertagen/i,
    );
  });

  it("does not present paid-plan backup retention as a current Free-plan feature", () => {
    for (const source of [checklist, retention]) {
      expect(source).toContain("Free");
      expect(source).toContain("Pro");
      expect(source).toContain("sieben");
      expect(source).toContain("30");
    }

    expect(checklist).toMatch(
      /Diese Pro-Frist darf nicht als aktuelle Free-Plan-Frist\s+ausgegeben werden\./,
    );
  });

  it("keeps the historical encrypted export as an explicit operational gate", () => {
    expect(checklist).toContain("Export muss vor dem Pilot");
    expect(retention).toContain("vor dem Pilot zu inventarisieren");
  });
});
