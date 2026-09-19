import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearAssessmentStatusRevision,
  getAssessmentStatusRevision,
  markAssessmentStatusChanged,
} from "@/lib/assessmentStatusRevision";

describe("assessment status revision", () => {
  beforeEach(() => {
    clearAssessmentStatusRevision();
    vi.restoreAllMocks();
  });

  it("invalidates only the athlete whose measurement changed", () => {
    vi.spyOn(Date, "now").mockReturnValue(1234);
    markAssessmentStatusChanged("athlete-1");

    expect(getAssessmentStatusRevision("athlete-1")).toBe(1234);
    expect(getAssessmentStatusRevision("athlete-2")).toBe(0);
  });
});
