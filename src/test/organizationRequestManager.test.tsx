import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OrganizationRequestManager from "@/components/admin/OrganizationRequestManager";

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

const request = {
  id: "request-1",
  reference_code: "RP-ABC123",
  status: "submitted",
  contact_name: "Alex Beispiel",
  work_email: "alex@verein.de",
  phone: null,
  job_title: "Sportliche Leitung",
  preferred_contact: "email",
  organization_name: "Sportverein Beispiel",
  organization_type: "local_club",
  country_code: "DE",
  website: "https://verein.de/",
  sports: ["Volleyball"],
  athlete_age_groups: ["U17"],
  performance_levels: ["Nachwuchsleistung"],
  team_count_band: "2_5",
  athlete_count_band: "25_99",
  coach_count_band: "2_5",
  rollout_scope: "pilot",
  desired_start: "next_4_weeks",
  goals: ["mental_routines", "team_overview"],
  support_needs: ["onboarding", "reporting"],
  context_note: "Wir möchten kontrolliert mit einem Team starten.",
  source: "web",
  submitted_at: "2026-08-08T08:00:00.000Z",
  updated_at: "2026-08-08T08:00:00.000Z",
};

describe("founder organization request manager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rpc.mockImplementation((name: string) => {
      if (name === "get_admin_organization_access_requests") {
        return Promise.resolve({ data: [request], error: null });
      }
      if (name === "approve_organization_access_request") {
        return Promise.resolve({ data: { invitation_token: "secure-token" }, error: null });
      }
      throw new Error(`Unexpected RPC: ${name}`);
    });
  });

  it("turns raw codes into a founder-readable decision brief", async () => {
    render(<OrganizationRequestManager />);

    expect(await screen.findByRole("heading", { name: "Sportverein Beispiel" })).toBeInTheDocument();
    expect(screen.getByText("Mentale Routinen im Alltag")).toBeInTheDocument();
    expect(screen.getByText("Aggregierter Teamzustand")).toBeInTheDocument();
    expect(screen.getByText("Persönliche Einführung")).toBeInTheDocument();
    expect(screen.getByText("in den nächsten 4 Wochen")).toBeInTheDocument();
    expect(screen.queryByText("mental_routines")).not.toBeInTheDocument();
  });

  it("requires an explicit final confirmation and never sends or charges automatically", async () => {
    render(<OrganizationRequestManager />);
    await screen.findByRole("heading", { name: "Sportverein Beispiel" });

    fireEvent.click(screen.getByRole("button", { name: "Persönlich freigeben" }));
    expect(
      await screen.findByRole("heading", { name: /verbindlich vorbereiten/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/keine e-mail versendet und keine zahlung ausgelöst/i)).toBeInTheDocument();
    expect(mocks.rpc).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Organisation freigeben" }));
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith(
      "approve_organization_access_request",
      {
        _request_id: "request-1",
        _access_tier: "community",
        _team_name: "Sportverein Beispiel",
        _team_sport: "Volleyball",
      },
    ));
    expect(await screen.findByDisplayValue(/organization\/invite\?token=secure-token/)).toBeInTheDocument();
  });
});
