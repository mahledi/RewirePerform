import { describe, expect, it } from "vitest";
import { DAILY_CONTENT } from "@/content/dailyContent";
import { PLAYER_DAYS } from "@/content/playerDays";
import {
  CURRENT_CONTENT_CROSSWALK,
  OLD_DAY_TARGETS,
  type SourceContentKind,
} from "@/prototypes/golden-days/currentContentCrosswalk";
import { GOLDEN_DAY_DRAFTS } from "@/prototypes/golden-days/goldenDayDrafts";
import { PROGRAM_DAY_DRAFTS } from "@/prototypes/golden-days/programDayDrafts";

const words = (value: string): number => value.trim().split(/\s+/u).filter(Boolean).length;

const expectedTools = [
  "W1", "W2", "W1", "W3", "W2", "W4", "W1", "W5", "W3", "W6", "W4", "W2", "W5", "W1",
  "W7", "W6", "W3", "W1", "W4", "W5", "W2", "W7", "W6", "W2", "W5", "W6", "W2", "W7",
  "W1", "W2", "W3", "W4", "W5", "W6", "W7", "W1", "W2", "W3", "W5", "W6", "W7", "W4",
  "W1", "W2", "W3", "W4", "W5", "W6", "W7", "W1", "W3", "W4", "W6", "W5", "W2", "SYSTEM",
] as const;

const expectedStages = [
  "Aufbau", "Aufbau", "Rückkehr", "Aufbau", "Rückkehr", "Aufbau", "Vertiefung", "Aufbau", "Rückkehr", "Aufbau",
  "Rückkehr", "Vertiefung", "Rückkehr", "Vertiefung", "Aufbau", "Rückkehr", "Vertiefung", "Vertiefung", "Vertiefung", "Vertiefung",
  "Vertiefung", "Rückkehr", "Vertiefung", "Integration", "Vertiefung", "Vertiefung", "Vertiefung", "Integration",
  "Vertiefung", "Vertiefung", "Vertiefung", "Vertiefung", "Vertiefung", "Vertiefung", "Vertiefung", "Vertiefung",
  "Vertiefung", "Vertiefung", "Vertiefung", "Vertiefung", "Vertiefung", "Integration",
  "Rückkehr", "Rückkehr", "Rückkehr", "Rückkehr", "Rückkehr", "Rückkehr", "Rückkehr",
  "Integration", "Integration", "Integration", "Integration", "Integration", "Integration", "Abschluss",
] as const;

const athleteCopy = (draft: (typeof PROGRAM_DAY_DRAFTS)[number]): string => JSON.stringify({
  tool: draft.tool,
  title: draft.title,
  cue: draft.cue,
  purpose: draft.purpose,
  scienceBite: draft.scienceBite,
  mission: draft.mission,
  comprehension: {
    prompt: draft.comprehension.prompt,
    options: draft.comprehension.options.map((option) => option.label),
    feedback: draft.comprehension.feedback,
  },
  preTraining: draft.preTraining,
  journal: draft.journal,
  optionalDepth: draft.optionalDepth,
  measurementBoundary: draft.measurementBoundary,
  integrationTools: draft.integrationTools?.map(({ cue, use }) => ({ cue, use })),
});

describe("complete 56-day V1.1 editorial draft", () => {
  it("contains every program day exactly once and follows the approved tool and stage map", () => {
    expect(PROGRAM_DAY_DRAFTS).toHaveLength(56);
    expect(PROGRAM_DAY_DRAFTS.map((draft) => draft.day)).toEqual(Array.from({ length: 56 }, (_, index) => index + 1));
    expect(PROGRAM_DAY_DRAFTS.map((draft) => draft.toolId)).toEqual(expectedTools);
    expect(PROGRAM_DAY_DRAFTS.map((draft) => draft.stage)).toEqual(expectedStages);

    for (let index = 1; index < PROGRAM_DAY_DRAFTS.length - 1; index += 1) {
      expect(PROGRAM_DAY_DRAFTS[index].toolId).not.toBe(PROGRAM_DAY_DRAFTS[index - 1].toolId);
    }
  });

  it("keeps one bounded daily flow with active recall and reflection", () => {
    for (const draft of PROGRAM_DAY_DRAFTS) {
      expect(draft.cue.trim().length).toBeGreaterThan(0);
      expect(draft.mission.steps.length).toBeGreaterThanOrEqual(2);
      expect(draft.mission.steps.length).toBeLessThanOrEqual(3);
      expect(draft.comprehension.options).toHaveLength(3);
      expect(new Set(draft.comprehension.options.map((option) => option.id)).size).toBe(3);
      expect(draft.comprehension.options.some((option) => option.id === draft.comprehension.correctOptionId)).toBe(true);
      expect(draft.preTraining).not.toBeNull();
      expect(draft.preTraining?.recallPrompt.trim().length).toBeGreaterThan(0);
      expect(draft.preTraining?.reveal.trim().length).toBeGreaterThan(0);
      expect(draft.journal.questions.filter(Boolean).length).toBeGreaterThanOrEqual(2);
      expect(draft.journal.questions.filter(Boolean).length).toBeLessThanOrEqual(3);
      expect(draft.journal.gratitudeMinWords).toBeGreaterThanOrEqual(6);
    }
  });

  it("keeps Science Bites short enough for the agreed youth-first load", () => {
    for (const draft of PROGRAM_DAY_DRAFTS) {
      const bite = [draft.scienceBite.title, ...draft.scienceBite.paragraphs].join(" ");
      expect(words(bite), `Tag ${draft.day} has ${words(bite)} Science-Bite words`).toBeGreaterThanOrEqual(35);
      const maximum = draft.stage === "Integration" || draft.stage === "Abschluss" ? 90 : 75;
      expect(words(bite), `Tag ${draft.day} has ${words(bite)} Science-Bite words`).toBeLessThanOrEqual(maximum);
    }
  });

  it("keeps every visible instruction scannable instead of rebuilding a text wall", () => {
    for (const draft of PROGRAM_DAY_DRAFTS) {
      expect(words(draft.purpose), `Tag ${draft.day} purpose is too long`).toBeLessThanOrEqual(32);
      expect(words(draft.mission.trigger), `Tag ${draft.day} trigger is too long`).toBeLessThanOrEqual(28);
      for (const step of draft.mission.steps) {
        expect(words(step), `Tag ${draft.day} mission step is too long: ${step}`).toBeLessThanOrEqual(18);
      }
      expect(words(draft.comprehension.prompt), `Tag ${draft.day} check prompt is too long`).toBeLessThanOrEqual(28);
      for (const option of draft.comprehension.options) {
        expect(words(option.label), `Tag ${draft.day} check option is too long: ${option.label}`).toBeLessThanOrEqual(18);
      }
      expect(words(draft.preTraining!.recallPrompt), `Tag ${draft.day} recall prompt is too long`).toBeLessThanOrEqual(24);
      for (const question of draft.journal.questions.filter(Boolean)) {
        expect(words(question.prompt), `Tag ${draft.day} journal prompt is too long: ${question.prompt}`).toBeLessThanOrEqual(24);
      }
    }
  });

  it("does not reveal the exact cue inside the open recall question", () => {
    const normalized = (value: string) => value.toLocaleLowerCase("de").replace(/[^a-zäöüß]+/gu, " ").trim();
    for (const draft of PROGRAM_DAY_DRAFTS) {
      expect(
        normalized(draft.preTraining!.recallPrompt),
        `Tag ${draft.day} gives away its cue before recall`,
      ).not.toContain(normalized(draft.cue));
    }
  });

  it("keeps editorial jargon, fake personalization, and absolute effect claims out of athlete copy", () => {
    const blocked = [
      "Prozesspunkt",
      "funktional flach",
      "Lernraum",
      "Grundweite",
      "Ego-Zusatz",
      "Selbstprojekt",
      "automatische Enge",
      "neuroplast",
      "Rechtsverteidiger",
      "Stürmer",
      "wissenschaftlich bewiesen",
      "verändert dein Gehirn",
    ];

    for (const draft of PROGRAM_DAY_DRAFTS) {
      const copy = athleteCopy(draft).toLocaleLowerCase("de");
      for (const phrase of blocked) {
        expect(copy, `Tag ${draft.day} contains blocked phrase: ${phrase}`).not.toContain(phrase.toLocaleLowerCase("de"));
      }
      expect(copy, `Tag ${draft.day} leaks an internal tool code`).not.toMatch(/\bW[1-7]\b/u);
      expect(copy, `Tag ${draft.day} promises a guaranteed product effect`).not.toMatch(/(?:programm|system|werkzeug)[^.!?]{0,80}garantiert/u);
    }
  });

  it("preserves the approved Golden-Day copy and only completes its context-independent pre-training variant", () => {
    for (const golden of GOLDEN_DAY_DRAFTS) {
      const full = PROGRAM_DAY_DRAFTS.find((draft) => draft.day === golden.day);
      expect(full).toBeDefined();

      const { preTraining: goldenPreTraining, ...goldenCore } = golden;
      const { preTraining: fullPreTraining, ...fullCore } = full!;
      expect(fullCore).toEqual(goldenCore);

      if (golden.day === 2 || golden.day === 15) {
        expect(goldenPreTraining).toBeNull();
        expect(fullPreTraining).not.toBeNull();
      } else {
        expect(fullPreTraining).toEqual(goldenPreTraining);
      }
    }
  });

  it("keeps integration compact and measurement claims honest", () => {
    for (const day of [28, 42, 56]) {
      const draft = PROGRAM_DAY_DRAFTS[day - 1];
      expect(draft.integrationTools, `Tag ${day} must expose the known toolbox`).toHaveLength(7);
      expect(draft.mission.steps).toHaveLength(3);
    }

    for (const day of [28, 56]) {
      const draft = PROGRAM_DAY_DRAFTS[day - 1];
      expect(draft.measurementBoundary?.body).toContain("weder deinen Wert noch beweist");
      expect(draft.measurementBoundary?.privacy).toContain("Journaltexte");
    }
  });
});

describe("current-to-V1.1 content inventory", () => {
  const countKind = (kind: SourceContentKind) => CURRENT_CONTENT_CROSSWALK.filter((item) => item.kind === kind).length;

  it("maps every current day to one or more authored target days", () => {
    expect(Object.keys(OLD_DAY_TARGETS).map(Number).sort((a, b) => a - b)).toEqual(Array.from({ length: 56 }, (_, index) => index + 1));
    for (const [sourceDay, targetDays] of Object.entries(OLD_DAY_TARGETS)) {
      expect(targetDays.length, `old day ${sourceDay} has no target`).toBeGreaterThan(0);
      expect(targetDays.every((day) => PROGRAM_DAY_DRAFTS.some((draft) => draft.day === day))).toBe(true);
    }
  });

  it("accounts for every structured source item instead of equating deletion with simplification", () => {
    expect(countKind("lens")).toBe(56);
    expect(countKind("primary-mechanism")).toBe(56);
    expect(countKind("today-trigger")).toBe(56);
    expect(countKind("core-shift")).toBe(56);
    expect(countKind("science-bite")).toBe(56);
    expect(countKind("task")).toBe(168);
    expect(countKind("journal-question")).toBe(225);
    expect(countKind("gratitude")).toBe(56);
    expect(countKind("free-reflection")).toBe(56);
    expect(countKind("self-talk")).toBe(PLAYER_DAYS.reduce((total, day) => total + day.self_talk_anchors.length, 0));
    expect(countKind("context-variant")).toBe(168);
    expect(countKind("comprehension")).toBe(
      Object.values(DAILY_CONTENT).reduce((total, day) => total + (day.comprehensionPool?.length ?? 0), 0),
    );
  });

  it("gives every source item a unique trace, an explicit treatment, and a non-empty source", () => {
    expect(new Set(CURRENT_CONTENT_CROSSWALK.map((item) => item.id)).size).toBe(CURRENT_CONTENT_CROSSWALK.length);
    for (const item of CURRENT_CONTENT_CROSSWALK) {
      expect(item.sourceLabel.trim(), item.id).not.toBe("");
      expect(item.rationale.trim(), item.id).not.toBe("");
      expect(["behalten", "verbinden", "optional", "neu formulieren", "echte Redundanz"]).toContain(item.decision);
      expect(item.targetDays).toEqual(OLD_DAY_TARGETS[item.sourceDay]);
    }
  });
});
