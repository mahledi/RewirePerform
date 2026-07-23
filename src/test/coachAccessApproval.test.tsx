import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CoachAccessApprovalPanel from "@/components/admin/CoachAccessApprovalPanel";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: mocks.rpc,
  },
}));

vi.mock("sonner", () => ({
  toast: {
    error: mocks.toastError,
    success: mocks.toastSuccess,
  },
}));

describe("manual coach access approval", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires explicit confirmation before atomically approving and assigning a coach", async () => {
    const onApproved = vi.fn();
    mocks.rpc
      .mockResolvedValueOnce({
        data: {
          user_id: "00000000-0000-4000-8000-000000000010",
          email: "coach@example.com",
          full_name: "QA Coach",
          email_confirmed: true,
          role: "athlete",
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          success: true,
          team_name: "RC Team",
          action: "coach_approved_and_assigned",
        },
        error: null,
      });

    render(<CoachAccessApprovalPanel teams={[]} onApproved={onApproved} />);

    fireEvent.change(screen.getByLabelText("E-Mail des bestehenden Kontos"), {
      target: { value: "  COACH@EXAMPLE.COM  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Prüfen" }));

    await waitFor(() => {
      expect(mocks.rpc).toHaveBeenNthCalledWith(1, "find_coach_access_candidate", {
        _email: "coach@example.com",
      });
      expect(screen.getByText("QA Coach")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Teamname"), {
      target: { value: "RC Team" },
    });
    fireEvent.change(screen.getByLabelText("Sportart, optional"), {
      target: { value: "Fußball" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Coach-Zugang freigeben" }));

    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("heading", { name: "Coach-Zugang verbindlich freigeben?" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Freigeben" }));

    await waitFor(() => {
      expect(mocks.rpc).toHaveBeenNthCalledWith(2, "approve_coach_access", {
        _user_id: "00000000-0000-4000-8000-000000000010",
        _team_id: null,
        _new_team_name: "RC Team",
        _new_team_sport: "Fußball",
      });
      expect(mocks.toastSuccess).toHaveBeenCalledWith(
        "Coach-Zugang freigegeben und RC Team zugeordnet.",
      );
      expect(onApproved).toHaveBeenCalledTimes(1);
    });
  });

  it("does not expose an approval action for an admin account", async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: {
        user_id: "00000000-0000-4000-8000-000000000011",
        email: "admin@example.com",
        full_name: "QA Admin",
        email_confirmed: true,
        role: "admin",
      },
      error: null,
    });

    render(<CoachAccessApprovalPanel teams={[]} onApproved={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("E-Mail des bestehenden Kontos"), {
      target: { value: "admin@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Prüfen" }));

    expect(
      await screen.findByText("Adminrollen können über diesen Weg nicht verändert werden."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Coach-Zugang freigeben" })).not.toBeInTheDocument();
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });
});
