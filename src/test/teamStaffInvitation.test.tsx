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
    render(<TeamStaffInvitation teamId="team-1" />);

    expect(await screen.findByText("Co-Coach-Zugang")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Co-Coach einladen" })).not.toBeInTheDocument();
  });

  it("lets a lead coach create a seven-day, email-bound invitation", async () => {
    mocks.rpc
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({
        data: { invitation_token: "secure-token" },
        error: null,
      });
    render(<TeamStaffInvitation teamId="team-1" />);

    fireEvent.click(await screen.findByRole("button", { name: "Co-Coach einladen" }));
    fireEvent.change(screen.getByLabelText("Bestätigte berufliche E-Mail"), {
      target: { value: "COACH@VEREIN.DE" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Einladung erstellen" }));

    await waitFor(() => expect(mocks.rpc).toHaveBeenLastCalledWith(
      "create_team_staff_invitation",
      { _team_id: "team-1", _email: "coach@verein.de", _team_role: "co_coach" },
    ));
    expect(await screen.findByText("Einladung ist bereit")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Link kopieren" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Einladung teilen" })).toBeInTheDocument();
    expect(screen.getByText(/einmalig, sieben tage gültig/i)).toBeInTheDocument();
  });
});
