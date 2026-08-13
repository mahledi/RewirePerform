import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
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

describe("organization invitation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authState.user = { id: "coach-1" };
    mocks.authState.loading = false;
    mocks.rpc.mockResolvedValue({ data: { success: true }, error: null });
    mocks.verifyRole.mockResolvedValue({ ok: true, value: "coach" });
  });

  it("uses the dedicated organization auth intent for a signed-out invitee", () => {
    mocks.authState.user = null;
    render(<MemoryRouter initialEntries={[`/organization/invite?token=${token}`]}><OrganizationInvite /></MemoryRouter>);

    expect(screen.getByRole("link", { name: "Mit eingeladener E-Mail registrieren" })).toHaveAttribute(
      "href",
      expect.stringContaining("intent=organization"),
    );
    expect(screen.getByRole("link", { name: "Bereits registriert? Anmelden" })).toHaveAttribute(
      "href",
      expect.stringContaining("intent=organization"),
    );
  });

  it("accepts once and verifies the authoritative role before showing success", async () => {
    render(<MemoryRouter initialEntries={[`/organization/invite?token=${token}`]}><OrganizationInvite /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Einladung verbindlich annehmen" }));

    await screen.findByRole("heading", { name: "Zugang freigegeben." });
    expect(mocks.rpc).toHaveBeenCalledWith("accept_organization_invitation", { _token: token });
    expect(mocks.verifyRole).toHaveBeenCalledWith(undefined, 5_000);
  });

  it("retries only the role check when the invitation was already accepted", async () => {
    mocks.verifyRole
      .mockResolvedValueOnce({ ok: false, failure: { code: "offline", retryable: true } })
      .mockResolvedValueOnce({ ok: true, value: "coach" });

    render(<MemoryRouter initialEntries={[`/organization/invite?token=${token}`]}><OrganizationInvite /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Einladung verbindlich annehmen" }));

    expect(await screen.findByText(/konnte auf diesem gerät aber noch nicht bestätigt werden/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Zugang auf diesem Gerät bestätigen" }));

    await waitFor(() => expect(screen.getByRole("heading", { name: "Zugang freigegeben." })).toBeInTheDocument());
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.verifyRole).toHaveBeenCalledTimes(2);
  });
});
