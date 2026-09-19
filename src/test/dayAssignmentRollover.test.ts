import { beforeEach, describe, expect, it, vi } from "vitest";
import { ensureAssignment } from "@/lib/dayAssignment";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  getEffectiveProgramStart: vi.fn(),
  resolveDay: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mocks.from },
}));

vi.mock("@/lib/getCurrentProgramDay", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/getCurrentProgramDay")>();
  return {
    ...actual,
    getEffectiveProgramStart: mocks.getEffectiveProgramStart,
  };
});

vi.mock("@/lib/getDayContent", () => ({
  resolveDay: mocks.resolveDay,
}));

describe("lazy day assignment after a date rollover", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getEffectiveProgramStart.mockResolvedValue({
      startDate: "2026-09-01",
      source: "team",
      hasTeam: true,
    });
    mocks.resolveDay.mockReturnValue({
      matrix: { dayNumber: 2, lens: "Tag 2" },
      content: {
        title: "Tag 2",
        tasks: [{ id: "task-2", title: "Mission Tag 2" }],
      },
    });
  });

  it("creates Day 2 only when the Day-2 Daily Flow is opened", async () => {
    let inserted: Record<string, unknown> | null = null;
    const existingQuery: Record<string, unknown> = {};
    existingQuery.select = vi.fn(() => existingQuery);
    existingQuery.eq = vi.fn(() => existingQuery);
    existingQuery.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });

    const insertQuery = {
      insert: vi.fn((payload: Record<string, unknown>) => {
        inserted = payload;
        return {
          select: () => ({
            single: async () => ({
              data: {
                id: "assignment-day-2",
                ...payload,
              },
              error: null,
            }),
          }),
        };
      }),
    };
    mocks.from
      .mockReturnValueOnce(existingQuery)
      .mockReturnValueOnce(insertQuery);

    const result = await ensureAssignment({
      userId: "athlete-1",
      date: new Date(2026, 8, 2),
      contextType: "training",
    });

    expect(inserted).toMatchObject({
      user_id: "athlete-1",
      date: "2026-09-02",
      assigned_day_number: 2,
      context_type: "training",
    });
    expect(result?.assignment.id).toBe("assignment-day-2");
    expect(mocks.resolveDay).toHaveBeenCalledWith(
      2,
      expect.any(Date),
      "training",
      { sport: null, position: null },
    );
  });
});
