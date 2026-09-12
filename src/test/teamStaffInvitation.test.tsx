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

    expect(await screen.findByText("Lead Coach verwaltet Zugänge")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Einladungslink erneuern" })).not.toBeInTheDocument();
  });

  it("shows a lead coach the reusable Co-Coach link without creating one per share", async () => {
    mocks.rpc
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({
        data: { invitation_code: "A1B2C3D4E5F60718293A" },
        error: null,
      });
    render(<TeamStaffInvitation teamId="team-1" teamName="SV Beispiel" />);

    await waitFor(() => expect(mocks.rpc).toHaveBeenLastCalledWith(
      "get_or_create_team_coach_invitation",
      { _team_id: "team-1" },
    ));
    expect(await screen.findByText("Co-Coach-Link ist bereit")).toBeInTheDocument();
    expect(screen.getByText("A1B2-C3D4-E5F6-0718-293A")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "WhatsApp" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Teilen" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Link kopieren" })).toBeInTheDocument();
    expect(screen.getByText(/bleibt aktiv, bis du ihn erneuerst/i)).toBeInTheDocument();
  });

  it("lets only the lead coach renew the reusable link", async () => {
    mocks.rpc
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: { invitation_code: "A1B2C3D4E5F60718293A" }, error: null })
      .mockResolvedValueOnce({ data: { invitation_code: "B1B2C3D4E5F60718293A" }, error: null });
    render(<TeamStaffInvitation teamId="team-1" teamName="SV Beispiel" />);

    fireEvent.click(await screen.findByRole("button", { name: "Einladungslink erneuern" }));
    await waitFor(() => expect(mocks.rpc).toHaveBeenLastCalledWith(
      "renew_team_coach_invitation",
      { _team_id: "team-1" },
    ));
    expect(await screen.findByText("B1B2-C3D4-E5F6-0718-293A")).toBeInTheDocument();
  });
});
