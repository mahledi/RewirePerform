import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getProgramDayDraft } from "@/content/programV11";
import {
  canOpenRestVisualization,
  createRestVisualizationNavigationState,
  readRestVisualizationIntent,
} from "@/lib/nativeRestVisualizationIntent";
import RestDayVisualizationFlow from "@/prototypes/golden-days/RestDayVisualizationFlow";

describe("native rest visualization return", () => {
  it("accepts only the safe local rest intent with a real calendar date", () => {
    const state = createRestVisualizationNavigationState({
      route: "/dashboard",
      kind: "rest_visualization",
      scheduledDate: "2026-08-06",
    });

    expect(readRestVisualizationIntent(state)).toEqual({
      kind: "rest_visualization",
      scheduledDate: "2026-08-06",
    });
    expect(createRestVisualizationNavigationState({
      route: "/dashboard",
      kind: "rest_visualization",
      scheduledDate: "2026-02-31",
    })).toBeNull();
    expect(createRestVisualizationNavigationState({
      route: "/journal",
      kind: "rest_visualization",
      scheduledDate: "2026-08-06",
    })).toBeNull();
  });

  it("opens only today's unfinished rest flow", () => {
    const intent = {
      kind: "rest_visualization" as const,
      scheduledDate: "2026-08-06",
    };

    expect(canOpenRestVisualization({
      intent,
      currentDate: "2026-08-06",
      eventType: "rest",
      checkinCompleted: false,
    })).toBe(true);
    expect(canOpenRestVisualization({
      intent,
      currentDate: "2026-08-07",
      eventType: "rest",
      checkinCompleted: false,
    })).toBe(false);
    expect(canOpenRestVisualization({
      intent,
      currentDate: "2026-08-06",
      eventType: "training",
      checkinCompleted: false,
    })).toBe(false);
    expect(canOpenRestVisualization({
      intent,
      currentDate: "2026-08-06",
      eventType: "rest",
      checkinCompleted: true,
    })).toBe(false);
  });

  it("introduces the visualization personally without exposing private data", () => {
    const draft = getProgramDayDraft(1);
    expect(draft).not.toBeNull();

    render(
      <RestDayVisualizationFlow
        draft={draft!}
        athleteName="Noah Beispiel"
      />,
    );

    expect(screen.getByRole("heading", { name: "Noah, deine Einheit ist bereit." })).toBeInTheDocument();
    expect(screen.getByText("Du musst kein perfektes Bild sehen.")).toBeInTheDocument();
  });
});
