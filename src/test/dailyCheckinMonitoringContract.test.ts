import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "src/components/dashboard/DailyCheckin.tsx"),
  "utf8",
);

describe("DailyCheckin monitoring contract", () => {
  it("records success only after the atomic tracking save", () => {
    const saveCall = source.indexOf("await saveDailyTracking({");
    const successEvent = source.indexOf('eventName: "daily_checkin_saved"', saveCall);
    const successStatus = source.indexOf('status: "success"', successEvent);
    const successStage = source.indexOf('stage: "atomic_tracking"', successEvent);

    expect(saveCall).toBeGreaterThan(-1);
    expect(successEvent).toBeGreaterThan(saveCall);
    expect(successStatus).toBeGreaterThan(successEvent);
    expect(successStage).toBeGreaterThan(successStatus);
  });

  it("keeps check-in values and private text out of the success event", () => {
    const successEvent = source.indexOf('eventName: "daily_checkin_saved"', source.indexOf("await saveDailyTracking({"));
    const successBlock = source.slice(successEvent, source.indexOf("});", successEvent) + 3);

    expect(successBlock).toContain("day_number");
    expect(successBlock).toContain("event_type");
    expect(successBlock).not.toContain("reflection");
    expect(successBlock).not.toContain("moodBefore");
    expect(successBlock).not.toContain("teamConnection");
  });
});
