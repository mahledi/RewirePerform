import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import MinorConsent from "@/pages/MinorConsent";
import type { MinorAuthorizationStatus } from "@/lib/minorAuthorization";

const api = vi.hoisted(() => ({
  resendGuardianAuthorization: vi.fn(),
  restartMinorAuthorization: vi.fn(),
  saveAthleteAssent: vi.fn(),
  setMinorAgeBand: vi.fn(),
  startGuardianAuthorization: vi.fn(),
}));

const context = vi.hoisted(() => ({
  status: null as MinorAuthorizationStatus | null,
  loading: false,
  error: null as string | null,
  refresh: vi.fn(async () => null),
  setStatus: vi.fn(),
}));

const auth = vi.hoisted(() => ({
  user: { id: "athlete-1", email: "athlete@example.de" } as { id: string; email: string } | null,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => auth,
}));

vi.mock("@/lib/minorAuthorization", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/minorAuthorization")>(),
  ...api,
}));

vi.mock("@/hooks/useMinorAuthorization", () => ({
  useMinorAuthorization: () => context,
}));

const baseStatus = (overrides: Partial<MinorAuthorizationStatus> = {}): MinorAuthorizationStatus => ({
  state: "unknown_age",
  age_band: null,
  product_status: "pending",
  guardian_status: "not_required",
  athlete_status: "required",
  data_contribution_status: "not_asked",
  guardian_email_mask: null,
  policy_key: "de_minor_product_v2_2026_07",
  product_version: "minor_product_v1_2026_07",
  guardian_notice_version: "guardian_notice_v2_2026_07",
  guardian_decision_version: "guardian_decision_v2_2026_07",
  athlete_assent_version: "athlete_assent_v2_2026_07",
  data_contribution_version: "data_contribution_v3_2026_07",
  enforcement_enabled: true,
  ...overrides,
});

const renderFlow = (entry = "/minor-consent") => render(
  <MemoryRouter initialEntries={[entry]}>
    <Routes>
      <Route path="/minor-consent" element={<MinorConsent />} />
      <Route path="/dashboard" element={<div>Dashboard erreicht</div>} />
      <Route path="/progress" element={<div>Fortschritt erreicht</div>} />
      <Route path="/settings" element={<div>Einstellungen erreicht</div>} />
    </Routes>
  </MemoryRouter>,
);

describe("minor consent production flow", () => {
  beforeEach(() => {
    context.status = baseStatus();
    context.loading = false;
    context.error = null;
    auth.user = { id: "athlete-1", email: "athlete@example.de" };
    context.refresh.mockClear();
    context.setStatus.mockClear();
    for (const mock of Object.values(api)) mock.mockReset();
  });

  afterEach(cleanup);

  it("stores only an age band and sends 16/17 users to their own decision", async () => {
    const next = baseStatus({
      state: "athlete_assent_required",
      age_band: "age_16_17",
      guardian_status: "not_required",
    });
    api.setMinorAgeBand.mockResolvedValue(next);
    renderFlow();

    expect(screen.getByText(/Ein Geburtsdatum oder Ausweis ist nicht erforderlich/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: /16 oder 17/ }));
    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));

    await waitFor(() => expect(api.setMinorAgeBand).toHaveBeenCalledWith("age_16_17"));
    expect(context.setStatus).toHaveBeenCalledWith(next);
  });

  it("validates the guardian address before creating an under-16 challenge", async () => {
    const pending = baseStatus({
      state: "guardian_pending",
      age_band: "under_16",
      guardian_status: "pending",
      guardian_email_mask: "e•••@b•••.de",
    });
    context.status = baseStatus({
      state: "guardian_contact_required",
      age_band: "under_16",
      guardian_status: "required",
    });
    api.startGuardianAuthorization.mockResolvedValue(pending);
    renderFlow();

    const send = screen.getByRole("button", { name: "Sicheren Link senden" });
    expect(send).toBeDisabled();
    fireEvent.change(screen.getByLabelText("E-Mail der sorgeberechtigten Person"), {
      target: { value: "ungueltig" },
    });
    expect(send).toBeDisabled();
    fireEvent.change(screen.getByLabelText("E-Mail der sorgeberechtigten Person"), {
      target: { value: "elternteil@example.de" },
    });
    fireEvent.click(send);

    await waitFor(() => expect(api.startGuardianAuthorization).toHaveBeenCalledWith("elternteil@example.de"));
    expect(context.setStatus).toHaveBeenCalledWith(pending);
    expect(screen.getByText(/keine Weitergabe an Trainer oder Verein/)).toBeInTheDocument();
  });

  it("blocks the athlete address after trimming and case normalization", () => {
    context.status = baseStatus({
      state: "guardian_contact_required",
      age_band: "under_16",
      guardian_status: "required",
    });
    renderFlow();

    const send = screen.getByRole("button", { name: "Sicheren Link senden" });
    fireEvent.change(screen.getByLabelText("E-Mail der sorgeberechtigten Person"), {
      target: { value: "  ATHLETE@EXAMPLE.DE " },
    });

    expect(screen.getByLabelText("E-Mail der sorgeberechtigten Person")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByLabelText("E-Mail der sorgeberechtigten Person")).toHaveAttribute(
      "aria-describedby",
      "guardian-email-error",
    );
    expect(send).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Diese Adresse gehört bereits zu deinem Athletenkonto. Bitte gib die E-Mail einer sorgeberechtigten Person ein.",
    );
    expect(api.startGuardianAuthorization).not.toHaveBeenCalled();
  });

  it("keeps the pending screen visible during a background status refresh", () => {
    context.status = baseStatus({
      state: "guardian_pending",
      age_band: "under_16",
      guardian_status: "pending",
      guardian_email_mask: "e•••@b•••.de",
    });
    context.loading = true;

    const { container } = renderFlow();

    expect(screen.getByRole("heading", { name: "Entscheidung noch offen" })).toBeInTheDocument();
    expect(container.querySelector('[data-app-loading-shell="true"]')).not.toBeInTheDocument();
  });

  it("replaces a pending guardian address and invalidates the old link through a new challenge", async () => {
    const pending = baseStatus({
      state: "guardian_pending",
      age_band: "under_16",
      guardian_status: "pending",
      guardian_email_mask: "n•••@e•••.de",
    });
    context.status = baseStatus({
      state: "guardian_pending",
      age_band: "under_16",
      guardian_status: "pending",
      guardian_email_mask: "a•••@e•••.de",
    });
    api.startGuardianAuthorization.mockResolvedValue(pending);
    renderFlow();

    fireEvent.click(screen.getByRole("button", { name: "E-Mail-Adresse ändern" }));
    expect(screen.getByRole("heading", { name: "E-Mail-Adresse ändern." })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("E-Mail der sorgeberechtigten Person"), {
      target: { value: "neue-adresse@example.de" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Neuen Link senden" }));

    await waitFor(() => expect(api.startGuardianAuthorization).toHaveBeenCalledWith(
      "neue-adresse@example.de",
    ));
    expect(context.setStatus).toHaveBeenCalledWith(pending);
  });

  it("uses the same centered email-status hierarchy as account confirmation", () => {
    context.status = baseStatus({
      state: "guardian_pending",
      age_band: "under_16",
      guardian_status: "pending",
      guardian_email_mask: "e•••@b•••.de",
    });
    renderFlow();

    expect(screen.getByRole("link", { name: "Zur Startseite" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Entscheidung noch offen" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Status prüfen" })).toHaveClass("bg-primary");
    expect(screen.getByRole("button", { name: "E-Mail erneut senden" })).toHaveClass("bg-secondary/50");
    expect(screen.getByRole("button", { name: "E-Mail-Adresse ändern" })).toHaveClass("text-primary");
  });

  it("opens email replacement as a clean standalone screen and can cancel back", () => {
    context.status = baseStatus({
      state: "guardian_pending",
      age_band: "under_16",
      guardian_status: "pending",
      guardian_email_mask: "e•••@b•••.de",
    });
    renderFlow();

    fireEvent.click(screen.getByRole("button", { name: "E-Mail-Adresse ändern" }));

    expect(screen.queryByRole("heading", { name: "Entscheidung noch offen" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "E-Mail-Adresse ändern." })).toBeInTheDocument();
    expect(screen.getByLabelText("E-Mail der sorgeberechtigten Person")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Abbrechen" }));

    expect(screen.getByRole("heading", { name: "Entscheidung noch offen" })).toBeInTheDocument();
  });

  it.each([
    ["guardian_pending", "Entscheidung noch offen"],
    ["guardian_declined", "Die Freigabe wurde nicht erteilt"],
  ] as const)("offers a safe settings exit from %s", (state, heading) => {
    context.status = baseStatus({
      state,
      age_band: "under_16",
      guardian_status: state === "guardian_pending" ? "pending" : "declined",
    });
    renderFlow();

    expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Zurück zu den Einstellungen" }));

    expect(screen.getByText("Einstellungen erreicht")).toBeInTheDocument();
  });

  it("never lets an under-16 athlete exceed the guardian's data-contribution choice", async () => {
    const authorized = baseStatus({
      state: "product_authorized",
      age_band: "under_16",
      product_status: "authorized",
      guardian_status: "authorized",
      athlete_status: "authorized",
      data_contribution_guardian: false,
      data_contribution_athlete: false,
      data_contribution_status: "declined",
    });
    context.status = baseStatus({
      state: "athlete_assent_required",
      age_band: "under_16",
      guardian_status: "authorized",
      data_contribution_guardian: false,
    });
    api.saveAthleteAssent.mockResolvedValue(authorized);
    renderFlow();

    const contribution = screen.getByRole("checkbox", { name: /Ich möchte an der Pilot-Auswertung teilnehmen/ });
    expect(contribution).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /Ich möchte RewirePerform nutzen/ }));
    fireEvent.click(screen.getByRole("button", { name: "Zustimmen und starten" }));

    await waitFor(() => expect(api.saveAthleteAssent).toHaveBeenCalledWith(true, false));
  });

  it("returns an already authorized athlete only to a safe local next route", async () => {
    context.status = baseStatus({ state: "product_authorized", product_status: "authorized", age_band: "adult" });
    renderFlow("/minor-consent?next=%2Fprogress");
    expect(await screen.findByText("Fortschritt erreicht")).toBeInTheDocument();
  });

  it("falls back to the dashboard for a backslash-normalized external next route", async () => {
    context.status = baseStatus({ state: "product_authorized", product_status: "authorized", age_band: "adult" });
    renderFlow(`/minor-consent?next=${encodeURIComponent("/\\evil.example")}`);

    expect(await screen.findByText("Dashboard erreicht")).toBeInTheDocument();
    expect(screen.queryByText("Fortschritt erreicht")).not.toBeInTheDocument();
  });
});
