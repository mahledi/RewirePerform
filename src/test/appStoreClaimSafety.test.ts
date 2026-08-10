import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { dashboardScienceBites } from "@/content/dashboardScienceBites";

const readSource = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("App Store claim safety", () => {
  it("keeps dashboard science bites sourced and free of false precision", () => {
    expect(dashboardScienceBites.length).toBeGreaterThanOrEqual(10);

    for (const bite of dashboardScienceBites) {
      expect(bite.fact.trim().length).toBeGreaterThan(40);
      expect(bite.source.trim().length).toBeGreaterThan(10);
      expect(bite.year).toBeGreaterThanOrEqual(1980);
      expect(bite.fact).not.toMatch(/\d+(?:[.,]\d+)?\s*%/);
      expect(bite.fact).not.toMatch(
        /\b(garantiert|beweist|stärkste[rns]?|buchstäblich|zweimal schneller)\b/i,
      );
      expect(bite.fact).not.toMatch(
        /(baut|verdrahtet|verändert).{0,30}(Gehirn|Myelin|Nervenbahn)/i,
      );
    }
  });

  it("keeps visible product copy inside the approved observed-change boundary", () => {
    const visibleCopy = [
      "src/pages/Settings.tsx",
      "src/components/SpeakingSection.tsx",
      "src/pages/Journal.tsx",
      "src/pages/Coach.tsx",
      "src/pages/Admin.tsx",
      "src/components/BrainSection.tsx",
      "src/components/ScienceSection.tsx",
      "src/demo/DemoPage.tsx",
      "src/demo/data/demoData.ts",
      "src/demo/components/DemoFrames.tsx",
      "src/demo/components/CoachDashboardDemo.tsx",
    ]
      .map(readSource)
      .join("\n");

    const retiredClaims = [
      "wissenschaftlich fundiertes 56-Tage-Mentaltraining",
      "vier neurokognitiven Phasen",
      "beschleunigt synaptische Bahnung",
      "baut dein Gehirn neue Verbindungen auf",
      "Strukturen im Gehirn verändern",
      "Schnellere Verdrahtung",
      "verdrahtet schneller und tiefer",
      "neue Bahnen schneller als beim Tippen",
      "Wirksamkeit (aggregiert)",
      'label="Wirksamkeit"',
      "Dein Gehirn baut sich physisch um",
      "Disziplin zu einem physischen Muskel",
      "100% Individuell",
      "Wirkung · Demo-Werte",
      "Fehlererholung",
      "Druckregulation",
    ];

    for (const claim of retiredClaims) {
      expect(visibleCopy).not.toContain(claim);
    }

    expect(visibleCopy).toContain("beobachtete Entwicklung");
    expect(visibleCopy).toContain(
      "RewirePerform misst oder garantiert keine körperliche Gehirnveränderung",
    );
    expect(visibleCopy).toContain("Wissenschaftliche Prinzipien.");
    expect(visibleCopy).toContain("Wie gut das");
    expect(visibleCopy).toContain("Gesamtsystem im Sportalltag funktioniert");
    expect(visibleCopy).toContain("Programmverlauf · Demo-Werte");
  });
});
