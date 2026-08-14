import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TeamStaffInvitation from "@/components/coach/TeamStaffInvitation";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: mocks.rpc },
}));

vi.mock("sonner", () => ({
  toast: { error: mocks.toastError, success: mocks.toastSuccess },
}));

describe("team staff invitation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does not expose invitation controls to a co-coach", async () => {
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    render(<TeamStaffInvitation teamId="team-1" teamName="SV Beispiel" />);

    expect(await screen.findByText("Co-Coach-Zugang")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Co-Coach einladen" })).not.toBeInTheDocument();
  });

  it("lets a lead coach create a seven-day shareable Coach-Code", async () => {
    mocks.rpc
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({
        data: { invitation_code: "A1B2C3D4E5F60718293A" },
        error: null,
      });
    render(<TeamStaffInvitation teamId="team-1" teamName="SV Beispiel" />);

    fireEvent.click(await screen.findByRole("button", { name: "Co-Coach einladen" }));
    fireEvent.click(screen.getByRole("button", { name: "Einladung erstellen" }));

    await waitFor(() => expect(mocks.rpc).toHaveBeenLastCalledWith(
      "create_team_coach_invitation",
      { _team_id: "team-1" },
    ));
    expect(await screen.findByText("Einladung ist bereit")).toBeInTheDocument();
    expect(screen.getByText("A1B2-C3D4-E5F6-0718-293A")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "WhatsApp" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Teilen" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Link kopieren" })).toBeInTheDocument();
    expect(screen.getByText(/einmalig · sieben tage gültig/i)).toBeInTheDocument();
  });
});
