import { describe, expect, it } from "vitest";
import {
  buildAdherenceDayLabels,
  buildSevenDayAdherencePoints,
} from "@/pages/Progress";
import { countActiveApplications } from "@/lib/flameStats";
import {
  getAthleteMeasurementDisplay,
  resolveProgressReferenceDateIso,
} from "@/lib/athleteProgressPresentation";

describe("program activity progress", () => {
  it("builds an honest adherence history from unique completed program days", () => {
    const points = buildSevenDayAdherencePoints([1, 3, 3, 60], 3);

    expect(points.map(({ day, rate }) => ({ day, rate }))).toEqual([
      { day: 1, rate: 1 },
      { day: 2, rate: 0.5 },
      { day: 3, rate: 2 / 3 },
    ]);
  });

  it("keeps an honest flat baseline when no day is completed", () => {
    const points = buildSevenDayAdherencePoints([], 4);

    expect(points).toHaveLength(4);
    expect(points.every((point) => point.rate === 0)).toBe(true);
    expect(points.every((point) => point.y === points[0].y)).toBe(true);
  });

  it("shows at most the latest seven days and never exceeds the program", () => {
    const points = buildSevenDayAdherencePoints([50, 56, 57], 80);
    expect(points).toHaveLength(7);
    expect(points[0].day).toBe(50);
    expect(points[6].day).toBe(56);
  });

  it("keeps graph labels on the real program week after day 56", () => {
    const referenceDateIso = resolveProgressReferenceDateIso(
      "2026-06-01",
      new Date("2026-08-20T12:00:00"),
    );
    const points = buildSevenDayAdherencePoints([50, 56], 56);

    expect(buildAdherenceDayLabels(points, 56, referenceDateIso))
      .toEqual(["Mo.", "Di.", "Mi.", "Do.", "Fr.", "Sa.", "So."]);
  });

  it.each([
    {
      label: "keeps the mid measurement due on day 28 until completed",
      status: { programDay: 28, midDue: true, midDone: false, postDue: false, postDone: false },
      expected: {
        title: "Zwischenmessung verfügbar",
        copy: "Deine Zwischenmessung ist jetzt freigeschaltet.",
      },
    },
    {
      label: "moves to the final measurement after the mid measurement is completed",
      status: { programDay: 28, midDue: false, midDone: true, postDue: false, postDone: false },
      expected: {
        title: "Nächster Messpunkt",
        copy: "Abschlussmessung an Tag 56. Bis dahin zählt deine tägliche Praxis.",
      },
    },
    {
      label: "keeps the post measurement due on day 56 until completed",
      status: { programDay: 56, midDue: false, midDone: true, postDue: true, postDone: false },
      expected: {
        title: "Abschlussmessung verfügbar",
        copy: "Deine Abschlussmessung ist jetzt freigeschaltet.",
      },
    },
    {
      label: "shows completion after the post measurement is completed",
      status: { programDay: 56, midDue: false, midDone: true, postDue: false, postDone: true },
      expected: {
        title: "Messungen abgeschlossen",
        copy: "Deine Start-, Zwischen- und Abschlussmessung sind abgeschlossen.",
      },
    },
    {
      label: "does not claim a skipped mid measurement was completed",
      status: { programDay: 56, midDue: false, midDone: false, postDue: false, postDone: true },
      expected: {
        title: "Abschlussmessung abgeschlossen",
        copy: "Deine Abschlussmessung ist abgeschlossen.",
      },
    },
  ])("$label", ({ status, expected }) => {
    expect(getAthleteMeasurementDisplay(status)).toEqual(expected);
  });

  it("counts real completed applications once per program day", () => {
    expect(countActiveApplications([
      { day_number: 1, completed_at: null, completion_status: "completed", task_completion: ["A", "B"] },
      { day_number: 1, completed_at: null, completion_status: "completed", task_completion: ["A"] },
      { day_number: 2, completed_at: null, completion_status: "completed", task_completion: ["C"] },
      { day_number: 3, completed_at: null, completion_status: "started", task_completion: ["D", "E"] },
    ])).toBe(3);
  });
});
