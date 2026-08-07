import { describe, expect, it } from "vitest";
import { PROGRAM_DAY_DRAFTS } from "@/prototypes/golden-days/programDayDrafts";
import {
  getRestDayVisualization,
  REST_DAY_EDITORIAL_COUNT,
} from "@/prototypes/golden-days/restDayVisualizations";

const words = (value: string): number => value.trim().split(/\s+/u).filter(Boolean).length;

const expectedSeconds = 260;

describe("56-day rest visualization editorial contract", () => {
  it("authors one complete, universal visualization path for every fixed program day", () => {
    expect(REST_DAY_EDITORIAL_COUNT).toBe(56);

    for (const draft of PROGRAM_DAY_DRAFTS) {
      const visualization = getRestDayVisualization(draft);
      expect(visualization.day).toBe(draft.day);
      expect(visualization.phases.map((phase) => phase.id)).toEqual([
        "breathing", "scene", "moment", "anchor", "action", "replay", "transfer",
      ]);
      expect(visualization.phases.reduce((sum, phase) => sum + phase.durationSec, 0)).toBe(expectedSeconds);
      expect(visualization.phases[0]).toMatchObject({ id: "breathing", durationSec: 120 });
      expect(visualization.phases[0].prompt).toContain("bis vier");
      expect(visualization.phases[0].prompt).toContain("bis sechs");
      expect(visualization.phases[0].prompt).toContain("Bauch");
      expect(visualization.phases[0].prompt).toContain("jede Zahl im Kopf");
      expect(visualization.phases[1].prompt).toMatch(/^Stell dir diese Sportsituation vor:/u);
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
        expect(anchor?.prompt).toContain("RewirePerform-Satz");
        expect(anchor?.reveal).toBe(draft.cue);
      }
    }
  });

  it("keeps all 56 day situations distinct without guessing a sport, position, or identity", () => {
    const scenes: string[] = [];
    const moments: string[] = [];
    const actions: string[] = [];
    const transfers: string[] = [];
    const sportSpecific = /\b(?:fußball|basketball|volleyball|tennis|boxen|torwart|stürmer|rechtsverteidiger|ball|ring|laufbahn|court|matte)\b/iu;

    for (const draft of PROGRAM_DAY_DRAFTS) {
      const visualization = getRestDayVisualization(draft);
      const [scene, moment, , action, replay, transfer] = visualization.phases.slice(1);
      scenes.push(scene.prompt);
      moments.push(moment.prompt);
      actions.push(action.prompt);
      transfers.push(transfer.prompt);
      expect(JSON.stringify(visualization), `Tag ${draft.day} guesses a sport or position`).not.toMatch(sportSpecific);
      expect(replay.prompt.toLocaleLowerCase("de")).toContain("visualisierung");
    }

    expect(new Set(scenes).size).toBe(56);
    expect(new Set(moments).size).toBe(56);
    expect(new Set(actions).size).toBe(56);
    expect(new Set(transfers).size).toBe(56);
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
      "innerer kampf",
      "vagus",
      "parasympath",
      "zwerchfell",
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
      expect(journal).not.toContain("vorstellung");
      expect(visualization.journal.intro).toContain("musst keine echte Anwendung behaupten");
    }
  });
});
