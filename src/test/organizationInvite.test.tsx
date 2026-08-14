import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OrganizationInvite from "@/pages/OrganizationInvite";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  verifyRole: vi.fn(),
  authState: { user: { id: "coach-1" } as { id: string } | null, loading: false },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: mocks.rpc },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: mocks.authState.user,
    loading: mocks.authState.loading,
    verifyRole: mocks.verifyRole,
  }),
}));

const token = "a".repeat(64);

const LocationProbe = () => {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>;
};

const renderInvite = (entry: string) => render(
  <MemoryRouter initialEntries={[entry]}>
    <Routes>
      <Route path="/organization/invite" element={<OrganizationInvite />} />
      <Route path="*" element={<LocationProbe />} />
    </Routes>
  </MemoryRouter>,
);

describe("organization invitation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authState.user = { id: "coach-1" };
    mocks.authState.loading = false;
    mocks.rpc.mockResolvedValue({ data: { success: true }, error: null });
    mocks.verifyRole.mockResolvedValue({ ok: true, value: "coach" });
  });

  it("sends a signed-out invitee through the Coach introduction while preserving the invite", () => {
    mocks.authState.user = null;
    renderInvite(`/organization/invite?token=${token}`);

    expect(screen.getByTestId("location")).toHaveTextContent(
      `/start/coach?redirect=%2Forganization%2Finvite%3Ftoken%3D${token}&auth_mode=signup`,
    );
  });

  it("accepts once and verifies the authoritative role before showing success", async () => {
    renderInvite(`/organization/invite?token=${token}`);
    fireEvent.click(screen.getByRole("button", { name: "Als Co-Coach verbinden" }));

    await screen.findByRole("heading", { name: "Coach-Team verbunden." });
    expect(mocks.rpc).toHaveBeenCalledWith("accept_organization_invitation", { _token: token });
    expect(mocks.verifyRole).toHaveBeenCalledWith(undefined, 5_000);
  });

  it("retries only the role check when the invitation was already accepted", async () => {
    mocks.verifyRole
      .mockResolvedValueOnce({ ok: false, failure: { code: "offline", retryable: true } })
      .mockResolvedValueOnce({ ok: true, value: "coach" });

    renderInvite(`/organization/invite?token=${token}`);
    fireEvent.click(screen.getByRole("button", { name: "Als Co-Coach verbinden" }));

    expect(await screen.findByText(/konnte auf diesem gerät aber noch nicht bestätigt werden/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Zugang auf diesem Gerät bestätigen" }));

    await waitFor(() => expect(screen.getByRole("heading", { name: "Coach-Team verbunden." })).toBeInTheDocument());
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.verifyRole).toHaveBeenCalledTimes(2);
  });

  it("shows the prefilled Coach-Code and accepts the shareable invitation RPC", async () => {
    const code = "A1B2C3D4E5F60718293A";
    renderInvite(`/organization/invite?coach=${code}`);

    expect(screen.getByText("A1B2-C3D4-E5F6-0718-293A")).toBeInTheDocument();
    expect(screen.getByText(/coach-code ist bereits eingetragen/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Als Co-Coach verbinden" }));

    await screen.findByRole("heading", { name: "Coach-Team verbunden." });
    expect(mocks.rpc).toHaveBeenCalledWith("accept_team_coach_invitation", { _code: code });
  });
});
