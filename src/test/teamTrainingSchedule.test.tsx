import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TeamTrainingSchedule from "@/components/coach/TeamTrainingSchedule";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  upsert: vi.fn(),
  deleteRows: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "coach-1" } }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mocks.from },
}));

describe("full coach team calendar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.upsert.mockResolvedValue({ error: null });
    mocks.deleteRows.mockResolvedValue({ error: null });
    mocks.from.mockImplementation((table: string) => {
      if (table !== "team_calendar_events") throw new Error(`Unexpected table: ${table}`);
      const query = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
        upsert: mocks.upsert,
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ in: mocks.deleteRows }),
        }),
      };
      return query;
    });
  });

  it("reuses the real event types and saves through team_calendar_events", async () => {
    render(<TeamTrainingSchedule teamId="team-1" variant="full" />);

    expect(await screen.findByRole("heading", { name: "Teamkalender" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Training" })).toHaveClass("min-h-12");
    expect(screen.getByRole("button", { name: "Ruhetag" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Wettkampf" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Training für diesen Tag setzen" }));
    fireEvent.click(screen.getByRole("button", { name: "Teamkalender speichern" }));

    await waitFor(() => expect(mocks.upsert).toHaveBeenCalledTimes(1));
    expect(mocks.from).toHaveBeenCalledWith("team_calendar_events");
    expect(mocks.upsert).toHaveBeenCalledWith(
      [expect.objectContaining({
        team_id: "team-1",
        event_type: "training",
        created_by: "coach-1",
      })],
      { onConflict: "team_id,date" },
    );
  });

  it("prepares exactly eight weeks from one training day without creating competitions", async () => {
    render(<TeamTrainingSchedule teamId="team-1" variant="full" />);

    fireEvent.click(await screen.findByRole("button", { name: "Training für diesen Tag setzen" }));
    fireEvent.click(screen.getByRole("button", { name: "1 Training pro Woche übernehmen" }));

    expect(screen.getByRole("alertdialog")).toHaveTextContent("Wettkämpfe werden niemals wiederholt oder überschrieben");
    fireEvent.click(screen.getByRole("button", { name: "Plan vorbereiten" }));
    fireEvent.click(screen.getByRole("button", { name: "Teamkalender speichern" }));

    await waitFor(() => expect(mocks.upsert).toHaveBeenCalledTimes(1));
    const [rows] = mocks.upsert.mock.calls[0] as [Array<{ event_type: string }>, unknown];
    expect(rows).toHaveLength(56);
    expect(rows.filter((row) => row.event_type === "training")).toHaveLength(8);
    expect(rows.filter((row) => row.event_type === "rest")).toHaveLength(48);
    expect(rows.some((row) => row.event_type === "competition")).toBe(false);
  });
});
