import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OrganizationRequestManager from "@/components/admin/OrganizationRequestManager";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  invoke: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: mocks.rpc, functions: { invoke: mocks.invoke } },
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
  team_name: null,
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
    mocks.invoke.mockResolvedValue({ error: null });
    mocks.rpc.mockImplementation((name: string, args?: Record<string, unknown>) => {
      if (name === "get_admin_organization_access_requests") {
        return Promise.resolve({ data: [request], error: null });
      }
      if (name === "prepare_organization_access_invitation_v1_3") {
        return Promise.resolve({
          data: {
            invitation_token: "secure-token",
            invitation_email: String(args?._invitation_email ?? "alex@verein.de"),
          },
          error: null,
        });
      }
      if (name === "delete_organization_access_request_spam") {
        return Promise.resolve({ data: { success: true }, error: null });
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

  it("requires an explicit final confirmation and never charges automatically", async () => {
    render(<OrganizationRequestManager />);
    await screen.findByRole("heading", { name: "Sportverein Beispiel" });

    fireEvent.click(screen.getByRole("button", { name: "Persönlich freigeben" }));
    expect(
      await screen.findByRole("heading", { name: /verbindlich vorbereiten/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/ausschließlich an diese adresse gesendet/i)).toBeInTheDocument();
    expect(screen.getByText(/es wird noch keine zahlung ausgelöst/i)).toBeInTheDocument();
    expect(mocks.rpc).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Organisation freigeben" }));
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith(
      "prepare_organization_access_invitation_v1_3",
      {
        _request_id: "request-1",
        _access_tier: "community",
        _team_name: null,
        _team_sport: null,
        _invitation_email: "alex@verein.de",
      },
    ));
    expect(await screen.findByDisplayValue(/organization\/invite\?token=secure-token/)).toBeInTheDocument();
    expect(mocks.invoke).toHaveBeenCalledWith("send-organization-access-invitation", {
      body: { recipient_email: "alex@verein.de", invitation_token: "secure-token" },
    });
  });

  it("keeps the personal link available after approval when transactional delivery fails", async () => {
    let approved = false;
    mocks.invoke.mockResolvedValue({ error: { message: "delivery failed" } });
    mocks.rpc.mockImplementation((name: string) => {
      if (name === "get_admin_organization_access_requests") {
        return Promise.resolve({
          data: [{ ...request, status: approved ? "approved_community" : "submitted" }],
          error: null,
        });
      }
      if (name === "prepare_organization_access_invitation_v1_3") {
        approved = true;
        return Promise.resolve({ data: { invitation_token: "secure-token", invitation_email: "alex@verein.de" }, error: null });
      }
      throw new Error(`Unexpected RPC: ${name}`);
    });

    render(<OrganizationRequestManager />);
    await screen.findByRole("heading", { name: "Sportverein Beispiel" });
    fireEvent.click(screen.getByRole("button", { name: "Persönlich freigeben" }));
    fireEvent.click(await screen.findByRole("button", { name: "Organisation freigeben" }));

    expect(await screen.findByText("Vorgang dokumentiert")).toBeInTheDocument();
    expect(screen.getByText(/falls der e-mail-versand nicht ankommt/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue(/organization\/invite\?token=secure-token/)).toBeInTheDocument();
    expect(mocks.toastError).toHaveBeenCalledWith(expect.stringMatching(/e-mail konnte nicht gesendet/i));
  });

  it("lets the admin bind a different personal Coach login before approval", async () => {
    render(<OrganizationRequestManager />);
    await screen.findByRole("heading", { name: "Sportverein Beispiel" });

    fireEvent.change(screen.getByLabelText("Persönlicher Main-Coach-Login"), {
      target: { value: "alex+coach@verein.de" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Persönlich freigeben" }));
    expect(await screen.findByText(/alex\+coach@verein\.de/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Organisation freigeben" }));

    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith(
      "prepare_organization_access_invitation_v1_3",
      expect.objectContaining({ _invitation_email: "alex+coach@verein.de" }),
    ));
    expect(mocks.invoke).toHaveBeenCalledWith("send-organization-access-invitation", {
      body: { recipient_email: "alex+coach@verein.de", invitation_token: "secure-token" },
    });
  });

  it("explains an active-athlete collision without sending an invitation", async () => {
    mocks.rpc.mockImplementation((name: string) => {
      if (name === "get_admin_organization_access_requests") {
        return Promise.resolve({ data: [request], error: null });
      }
      if (name === "prepare_organization_access_invitation_v1_3") {
        return Promise.resolve({ data: null, error: { message: "coach_email_is_active_athlete" } });
      }
      throw new Error(`Unexpected RPC: ${name}`);
    });

    render(<OrganizationRequestManager />);
    await screen.findByRole("heading", { name: "Sportverein Beispiel" });
    fireEvent.click(screen.getByRole("button", { name: "Persönlich freigeben" }));
    fireEvent.click(await screen.findByRole("button", { name: "Organisation freigeben" }));

    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith(
      expect.stringMatching(/aktiven Athletenkonto/),
    ));
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it("replaces an open Main-Coach invitation instead of requiring a new inquiry", async () => {
    const approvedRequest = { ...request, status: "approved_community" };
    mocks.rpc.mockImplementation((name: string, args?: Record<string, unknown>) => {
      if (name === "get_admin_organization_access_requests") {
        return Promise.resolve({ data: [approvedRequest], error: null });
      }
      if (name === "reissue_organization_access_invitation_v1_3") {
        return Promise.resolve({
          data: {
            invitation_token: "replacement-token",
            invitation_email: String(args?._invitation_email ?? "alex@verein.de"),
          },
          error: null,
        });
      }
      throw new Error(`Unexpected RPC: ${name}`);
    });

    render(<OrganizationRequestManager />);
    await screen.findByRole("heading", { name: "Sportverein Beispiel" });
    fireEvent.change(screen.getByLabelText("Persönlicher Main-Coach-Login"), {
      target: { value: "alex+coach@verein.de" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Einladung neu ausstellen" }));
    expect(await screen.findByText(/bisherige Link wird sofort ungültig/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Alten Link ersetzen" }));

    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith(
      "reissue_organization_access_invitation_v1_3",
      {
        _request_id: "request-1",
        _invitation_email: "alex+coach@verein.de",
      },
    ));
    expect(mocks.invoke).toHaveBeenCalledWith("send-organization-access-invitation", {
      body: { recipient_email: "alex+coach@verein.de", invitation_token: "replacement-token" },
    });
    expect(await screen.findByDisplayValue(/organization\/invite\?token=replacement-token/)).toBeInTheDocument();
  });

  it("requires a destructive confirmation before permanently deleting confirmed fake or spam", async () => {
    render(<OrganizationRequestManager />);
    await screen.findByRole("heading", { name: "Sportverein Beispiel" });

    fireEvent.click(screen.getByRole("button", { name: "Fake/Spam löschen" }));
    expect(await screen.findByRole("heading", { name: /endgültig löschen/i })).toBeInTheDocument();
    expect(screen.getByText(/echte Anfrage kannst du stattdessen ablehnen/i)).toBeInTheDocument();
    expect(mocks.rpc).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Endgültig als Fake/Spam löschen" }));
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith(
      "delete_organization_access_request_spam",
      {
        _request_id: "request-1",
        _confirmation: "DELETE_FAKE_OR_SPAM",
      },
    ));
  });
});
