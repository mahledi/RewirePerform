import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PostSignupOnboardingGate from "@/components/onboarding/PostSignupOnboardingGate";
import {
  beginPostSignupOnboarding,
  clearPostSignupOnboarding,
  pendingPostAuthorizationTeamCode,
  queuePostAuthorizationTeamJoin,
} from "@/lib/postSignupOnboarding";

const joinTeamByCode = vi.hoisted(() => vi.fn());

vi.mock("@/lib/teamJoin", () => ({ joinTeamByCode }));

const auth = vi.hoisted(() => ({
  user: { id: "athlete-1" } as { id: string } | null,
  role: "athlete" as "athlete" | "coach" | "admin" | null,
  roleVerified: true,
  loading: false,
}));

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => auth }));

const gateTree = () => (
  <MemoryRouter initialEntries={["/questionnaire"]}>
    <Routes>
      <Route
        path="/questionnaire"
        element={<PostSignupOnboardingGate><div>Realer Fragebogen</div></PostSignupOnboardingGate>}
      />
      <Route path="/welcome" element={<div>Produktive Einführung</div>} />
      <Route path="/dashboard" element={<div>Athleten-Dashboard</div>} />
      <Route path="/coach" element={<div>Coach-Bereich</div>} />
      <Route path="/admin" element={<div>Admin-Bereich</div>} />
    </Routes>
  </MemoryRouter>
);

const renderGate = () => render(gateTree());

describe("post-signup onboarding gate", () => {
  beforeEach(() => {
    joinTeamByCode.mockReset();
    window.localStorage.clear();
    window.sessionStorage.clear();
    clearPostSignupOnboarding("athlete-1");
    clearPostSignupOnboarding("athlete-2");
    auth.user = { id: "athlete-1" };
    auth.role = "athlete";
    auth.roleVerified = true;
    auth.loading = false;
    joinTeamByCode.mockResolvedValue({ success: true });
  });

  it("inserts the introduction at the exact point where a new athlete would open the questionnaire", () => {
    beginPostSignupOnboarding("athlete-1", "join");
    renderGate();
    expect(screen.getByText("Produktive Einführung")).toBeInTheDocument();
  });

  it("opens the questionnaire directly for an existing athlete", () => {
    renderGate();
    expect(screen.getByText("Realer Fragebogen")).toBeInTheDocument();
  });

  it("does not leak one athlete's pending state to another account on the same device", () => {
    beginPostSignupOnboarding("athlete-2", "solo");
    renderGate();
    expect(screen.getByText("Realer Fragebogen")).toBeInTheDocument();
  });

  it("never redirects a coach into the athlete introduction", () => {
    auth.role = "coach";
    beginPostSignupOnboarding("athlete-1", "solo");
    renderGate();
    expect(screen.getByText("Coach-Bereich")).toBeInTheDocument();
  });

  it("never exposes the athlete questionnaire to an admin", () => {
    auth.role = "admin";
    beginPostSignupOnboarding("athlete-1", "solo");
    renderGate();
    expect(screen.getByText("Admin-Bereich")).toBeInTheDocument();
  });

  it("fails closed while the current role is not verified", () => {
    auth.roleVerified = false;
    beginPostSignupOnboarding("athlete-1", "solo");
    const { container } = renderGate();
    expect(container.querySelector('[data-app-loading-shell="true"]')).toBeInTheDocument();
    expect(screen.queryByText("Produktive Einführung")).not.toBeInTheDocument();
  });

  it("joins a queued team only after the product gate has admitted the athlete", async () => {
    beginPostSignupOnboarding("athlete-1", "join");
    queuePostAuthorizationTeamJoin("athlete-1", "abc123", true);

    renderGate();

    expect(await screen.findByText("Produktive Einführung")).toBeInTheDocument();
    expect(joinTeamByCode).toHaveBeenCalledTimes(1);
    expect(joinTeamByCode).toHaveBeenCalledWith("ABC123");
    expect(pendingPostAuthorizationTeamCode("athlete-1")).toBeNull();
  });

  it("completes a queued join for an existing athlete without replaying the introduction", async () => {
    queuePostAuthorizationTeamJoin("athlete-1", "abc123", false);

    renderGate();

    expect(await screen.findByText("Athleten-Dashboard")).toBeInTheDocument();
    expect(joinTeamByCode).toHaveBeenCalledWith("ABC123");
    expect(pendingPostAuthorizationTeamCode("athlete-1")).toBeNull();
  });

  it("finishes an in-flight join when auth refreshes the same user object", async () => {
    let resolveJoin!: (value: { success: true }) => void;
    joinTeamByCode.mockReturnValue(new Promise((resolve) => { resolveJoin = resolve; }));
    queuePostAuthorizationTeamJoin("athlete-1", "abc123", false);

    const view = renderGate();
    await waitFor(() => expect(joinTeamByCode).toHaveBeenCalledTimes(1));
    auth.user = { id: "athlete-1" };
    view.rerender(gateTree());
    resolveJoin({ success: true });

    expect(await screen.findByText("Athleten-Dashboard")).toBeInTheDocument();
    expect(joinTeamByCode).toHaveBeenCalledTimes(1);
  });

  it("shows a recoverable error and retries the queued team join", async () => {
    joinTeamByCode
      .mockResolvedValueOnce({ success: false, message: "temporary" })
      .mockResolvedValueOnce({ success: true });
    queuePostAuthorizationTeamJoin("athlete-1", "abc123", false);

    renderGate();

    expect(await screen.findByRole("heading", { name: "Teambeitritt noch offen." })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Erneut versuchen" }));
    expect(await screen.findByText("Athleten-Dashboard")).toBeInTheDocument();
    expect(joinTeamByCode).toHaveBeenCalledTimes(2);
  });

  it("can continue without the team after a recoverable join failure", async () => {
    joinTeamByCode.mockResolvedValue({ success: false, message: "temporary" });
    queuePostAuthorizationTeamJoin("athlete-1", "abc123", false);

    renderGate();

    fireEvent.click(await screen.findByRole("button", { name: "Ohne Team fortfahren" }));
    expect(await screen.findByText("Athleten-Dashboard")).toBeInTheDocument();
    expect(pendingPostAuthorizationTeamCode("athlete-1")).toBeNull();
  });

  it.each(["coach", "admin"] as const)("never joins a team for a verified %s", async (role) => {
    auth.role = role;
    queuePostAuthorizationTeamJoin("athlete-1", "abc123", false);

    renderGate();

    expect(await screen.findByText(role === "coach" ? "Coach-Bereich" : "Admin-Bereich")).toBeInTheDocument();
    await waitFor(() => expect(joinTeamByCode).not.toHaveBeenCalled());
  });
});
