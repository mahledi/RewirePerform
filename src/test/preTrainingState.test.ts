import { describe, expect, it } from "vitest";
import {
  hasCompletedPreTraining,
  isPreTrainingExpired,
  withPreTrainingCompletion,
} from "@/lib/preTrainingState";

describe("pre-training state", () => {
  const referenceDate = new Date(2026, 7, 30, 12, 0);

  it("expires a timed event when its local start is reached", () => {
    const event = {
      date: "2026-08-30",
      training_local_hour: 17,
      training_local_minute: 30,
    };
    expect(isPreTrainingExpired(event, referenceDate, new Date(2026, 7, 30, 17, 29))).toBe(false);
    expect(isPreTrainingExpired(event, referenceDate, new Date(2026, 7, 30, 17, 30))).toBe(true);
  });

  it("keeps untimed and non-reference-day events available", () => {
    expect(isPreTrainingExpired({ date: "2026-08-30" }, referenceDate, new Date(2026, 7, 30, 23, 0))).toBe(false);
    expect(isPreTrainingExpired({
      date: "2026-08-29",
      training_local_hour: 8,
      training_local_minute: 0,
    }, referenceDate, new Date(2026, 7, 30, 23, 0))).toBe(false);
  });

  it("preserves the assignment payload while recording completion", () => {
    const payload = withPreTrainingCompletion(
      { contentSummary: { lens: "Fokus" } },
      "training",
      "2026-08-30T15:00:00.000Z",
    );
    expect(hasCompletedPreTraining(payload)).toBe(true);
    expect(payload).toMatchObject({
      contentSummary: { lens: "Fokus" },
      pre_training_completion: {
        completed_at: "2026-08-30T15:00:00.000Z",
        event_type: "training",
      },
    });
  });
});
