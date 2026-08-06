import { describe, expect, it } from "vitest";
import { PROGRAM_DAY_DRAFTS } from "@/prototypes/golden-days/programDayDrafts";
import {
  getRestDayVisualization,
  REST_DAY_EDITORIAL_COUNT,
} from "@/prototypes/golden-days/restDayVisualizations";

const words = (value: string): number => value.trim().split(/\s+/u).filter(Boolean).length;

const expectedSeconds = {
  Aufbau: 240,
  Rückkehr: 270,
  Vertiefung: 330,
  Integration: 390,
  Abschluss: 480,
} as const;

describe("56-day rest visualization editorial contract", () => {
  it("authors a complete guided and own-scene path for every fixed program day", () => {
    expect(REST_DAY_EDITORIAL_COUNT).toBe(56);

    for (const draft of PROGRAM_DAY_DRAFTS) {
      const visualization = getRestDayVisualization(draft);
      expect(visualization.day).toBe(draft.day);
      expect(visualization.phases.map((phase) => phase.id)).toEqual([
        "arrive", "scene", "moment", "anchor", "action", "replay", "transfer",
      ]);
      expect(visualization.ownScenePhases.map((phase) => phase.id)).toEqual([
        "arrive", "scene", "moment", "anchor", "action", "replay", "transfer",
      ]);
      expect(visualization.phases.reduce((sum, phase) => sum + phase.durationSec, 0)).toBe(expectedSeconds[draft.stage]);
      expect(visualization.ownScenePhases[1].prompt).toContain("eigene passende Sportszene");
      expect(visualization.journal.questions).toHaveLength(2);
      expect(new Set(visualization.journal.questions.map((question) => question.id)).size).toBe(2);
    }
  });

  it("keeps exactly one fixed day anchor and raises retrieval demand by learning stage", () => {
    for (const draft of PROGRAM_DAY_DRAFTS) {
      const anchor = getRestDayVisualization(draft).phases.find((phase) => phase.id === "anchor");
      expect(anchor).toBeDefined();
      if (draft.stage === "Aufbau") {
        expect(anchor?.prompt).toContain(draft.cue);
        expect(anchor?.reveal).toBeUndefined();
      } else {
        expect(anchor?.prompt).not.toContain(draft.cue);
        expect(anchor?.reveal).toBe(draft.cue);
      }
    }
  });

  it("uses youth-first instructions instead of editorial or visualization jargon", () => {
    const blocked = [
      "cue",
      "trigger",
      "mechanismus",
      "universeller auslöser",
      "prozesspunkt",
      "metakognition",
      "neuroplast",
      "simulation",
      "perfektes bild sehen",
    ];

    for (const draft of PROGRAM_DAY_DRAFTS) {
      const visualization = getRestDayVisualization(draft);
      const visibleCopy = JSON.stringify({
        title: visualization.title,
        phases: visualization.phases,
        journal: visualization.journal,
      }).toLocaleLowerCase("de");
      for (const phrase of blocked) {
        expect(visibleCopy, `Tag ${draft.day} contains blocked phrase: ${phrase}`).not.toContain(phrase);
      }
      for (const phase of visualization.phases) {
        expect(words(phase.prompt), `Tag ${draft.day} phase ${phase.id} is too long`).toBeLessThanOrEqual(30);
      }
      for (const question of visualization.journal.questions) {
        expect(words(question.prompt), `Tag ${draft.day} journal question is too long`).toBeLessThanOrEqual(24);
      }
    }
  });

  it("never asks for or stores the athlete's private imagined scene", () => {
    for (const draft of PROGRAM_DAY_DRAFTS) {
      const visualization = getRestDayVisualization(draft);
      const journal = JSON.stringify(visualization.journal).toLocaleLowerCase("de");
      expect(journal).not.toMatch(/(?:lade|sende|teile|speicher).{0,30}(?:szene|vorstellung)/u);
      expect(visualization.journal.intro).toContain("musst keine echte Anwendung behaupten");
    }
  });
});
