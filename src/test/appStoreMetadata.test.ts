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
    const subtitle = textBlockAfter("Subtitle, 25/30 characters:");
    const promotionalText = textBlockAfter("Promotional text, 124/170 characters:");
    const keywords = textBlockAfter("Keywords, 89/100 UTF-8 bytes:");
    const description = textBlockAfter("Description:");
    const reviewNotes = textBlockAfter("Review notes draft:");

    expect([...subtitle]).toHaveLength(25);
    expect([...subtitle].length).toBeLessThanOrEqual(30);
    expect([...promotionalText]).toHaveLength(124);
    expect([...promotionalText].length).toBeLessThanOrEqual(170);
    expect(Buffer.byteLength(keywords, "utf8")).toBe(89);
    expect(Buffer.byteLength(keywords, "utf8")).toBeLessThanOrEqual(100);
    expect([...description].length).toBeLessThanOrEqual(4_000);
    expect(Buffer.byteLength(reviewNotes, "utf8")).toBeLessThanOrEqual(4_000);
  });

  it("keeps the first version sport-neutral and inside the claim boundary", () => {
    const description = textBlockAfter("Description:");

    expect(description).toContain("Athletinnen und Athleten");
    expect(description).toContain("Training, Wettkampf oder Ruhetag");
    expect(description).toContain("kein medizinisches Produkt");
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
