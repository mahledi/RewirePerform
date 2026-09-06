import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAssessmentCompletionStatus } from "@/lib/programProgress";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  getOrCreateActiveInstance: vi.fn(),
  getEffectiveTodayDate: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mocks.from, rpc: vi.fn() },
}));

vi.mock("@/lib/programInstance", () => ({
  getOrCreateActiveInstance: mocks.getOrCreateActiveInstance,
}));

vi.mock("@/lib/qaTime", () => ({
  getEffectiveTodayDate: mocks.getEffectiveTodayDate,
}));

const assessmentQuery = (result: { data: unknown; error: unknown }) => {
  const chain: Record<string, unknown> = {};
  for (const method of ["select", "eq", "in"]) {
    chain[method] = vi.fn(() => chain);
  }
  chain.then = (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve);
  return chain;
};

describe("assessment completion status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getOrCreateActiveInstance.mockResolvedValue({
      id: "instance-current",
      started_at: "2026-08-01",
    });
    mocks.getEffectiveTodayDate.mockResolvedValue(new Date("2026-08-28T12:00:00"));
  });

  it("counts only the current program instance and unlocks mid after a complete pre measurement", async () => {
    const query = assessmentQuery({
      data: [
        ...["csai2r", "smtq", "flow_short"].map((assessment_type) => ({ assessment_type, timing: "pre" })),
        { assessment_type: "csai2r", timing: "mid" },
      ],
      error: null,
    });
    mocks.from.mockReturnValue(query);

    const status = await getAssessmentCompletionStatus("athlete-1");

    expect(status).toMatchObject({
      instanceId: "instance-current",
      preDone: true,
      midDue: true,
      midDone: false,
      postDue: false,
      postDone: false,
      programDay: 28,
    });
    expect(query.eq).toHaveBeenCalledWith("user_id", "athlete-1");
    expect(query.eq).toHaveBeenCalledWith("program_instance_id", "instance-current");
  });

  it("fails closed when the assessment read fails", async () => {
    mocks.from.mockReturnValue(assessmentQuery({
      data: null,
      error: { message: "read_failed" },
    }));

    await expect(getAssessmentCompletionStatus("athlete-1"))
      .rejects.toEqual({ message: "read_failed" });
  });
});
