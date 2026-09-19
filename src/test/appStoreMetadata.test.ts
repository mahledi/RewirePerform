import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const metadata = readFileSync(
  resolve(
    process.cwd(),
    "docs/APP_STORE_CONNECT_PACKAGE_2026-07-23.md",
  ),
  "utf8",
);

function textBlockAfter(label: string) {
  const labelIndex = metadata.indexOf(label);
  if (labelIndex === -1) throw new Error(`Missing metadata label: ${label}`);
  const match = metadata.slice(labelIndex).match(/```text\n([\s\S]*?)\n```/);
  if (!match) throw new Error(`Missing text block after: ${label}`);
  return match[1];
}

describe("App Store metadata package", () => {
  it("stays within Apple's current localized field limits", () => {
    const subtitle = textBlockAfter("Subtitle, 30/30 characters:");
    const promotionalText = textBlockAfter("Promotional text, 148/170 characters:");
    const keywords = textBlockAfter("Keywords, 95/100 UTF-8 bytes:");
    const description = textBlockAfter("Description:");
    const reviewNotes = textBlockAfter("Review notes draft:");

    expect([...subtitle]).toHaveLength(30);
    expect([...subtitle].length).toBeLessThanOrEqual(30);
    expect([...promotionalText]).toHaveLength(148);
    expect([...promotionalText].length).toBeLessThanOrEqual(170);
    expect(Buffer.byteLength(keywords, "utf8")).toBe(95);
    expect(Buffer.byteLength(keywords, "utf8")).toBeLessThanOrEqual(100);
    expect([...description].length).toBeLessThanOrEqual(4_000);
    expect(Buffer.byteLength(reviewNotes, "utf8")).toBeLessThanOrEqual(4_000);
  });

  it("keeps the first version sport-neutral and inside the claim boundary", () => {
    const description = textBlockAfter("Description:");

    expect(description).toContain("Prinzipien von Lernen und Neuroplastizität");
    expect(description).toContain("klarer, präsenter und freier zu handeln");
    expect(description).toContain("zusammengefasste Teamzustände");
    expect(description).toContain("kein medizinisches Produkt");
    expect(description).not.toMatch(/garantiert|bewiesen|wirksam|Heilung/i);
    expect(description).not.toMatch(/Fußball|Fussball|Torwart|Stürmer|Boxer|Turner/i);
  });

  it("keeps external actions and legal gates visibly blocked", () => {
    expect(metadata).toContain(
      "No App Store Connect app record, build upload, TestFlight group",
    );
    expect(metadata).toContain(
      "External legal review remains mandatory",
    );
    expect(metadata).toMatch(
      /No real user, including Farin, may be\s+used for destructive testing/,
    );
  });
});
