import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import GuardianDecision from "@/pages/GuardianDecision";

const api = vi.hoisted(() => ({
  inspectGuardianDecision: vi.fn(),
  inspectGuardianManagement: vi.fn(),
  revokeGuardianAuthorization: vi.fn(),
  submitGuardianDecision: vi.fn(),
  setGuardianFeedbackTextAuthorization: vi.fn(),
  withdrawGuardianDataContribution: vi.fn(),
}));

vi.mock("@/lib/minorAuthorization", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/minorAuthorization")>(),
  ...api,
}));

const renderDecision = (entry = "/guardian/decision#token=secure-decision-token") => render(
  <MemoryRouter initialEntries={[entry]}>
    <GuardianDecision />
  </MemoryRouter>,
);

describe("guardian decision production flow", () => {
  beforeEach(() => {
    for (const mock of Object.values(api)) mock.mockReset();
    api.inspectGuardianDecision.mockResolvedValue({
      state: "pending",
      policy_key: "de_minor_product_v2_2026_07",
      athlete_first_name: "Luka",
    });
  });

  afterEach(cleanup);

  it("requires separate guardian and product confirmations before approval", async () => {
    api.submitGuardianDecision.mockResolvedValue({
      state: "approved",
      receiptDelivery: "failed",
      manageUrl: "https://rewireperform.com/guardian/decision#manage=secure-management-token",
    });
    renderDecision();

    const allow = await screen.findByRole("button", { name: "Zugang erlauben" });
    expect(allow).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Verantwortung und Speicherdauer" }));
    expect(screen.getByText(/bis zu 370 Tage aktiv/)).toBeInTheDocument();
    expect(screen.getByText(/Mahle Herzog, handelnd unter RewirePerform/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox", { name: /Ich bestätige, dass ich.*sorgeberechtigt/ }));
    expect(allow).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /Nutzung des RewirePerform-Programms erlauben/ }));
    expect(allow).toBeEnabled();
    fireEvent.click(allow);

    await waitFor(() => expect(api.submitGuardianDecision).toHaveBeenCalledWith(
      "secure-decision-token",
      true,
      false,
      false,
    ));
    expect(await screen.findByRole("heading", { name: "Entscheidung gespeichert" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Freigabe verwalten" })).toHaveAttribute(
      "href",
      "https://rewireperform.com/guardian/decision#manage=secure-management-token",
    );
  });

  it("allows an informed guardian to decline without accepting the product", async () => {
    api.submitGuardianDecision.mockResolvedValue({
      state: "declined",
      receiptDelivery: "not_required",
      manageUrl: null,
    });
    renderDecision();

    const decline = await screen.findByRole("button", { name: "Nicht erlauben" });
    expect(decline).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /Ich bestätige, dass ich.*sorgeberechtigt/ }));
    expect(decline).toBeEnabled();
    fireEvent.click(decline);

    await waitFor(() => expect(api.submitGuardianDecision).toHaveBeenCalledWith(
      "secure-decision-token",
      false,
      false,
      false,
    ));
    expect(await screen.findByRole("heading", { name: "Freigabe nicht erteilt" })).toBeInTheDocument();
  });

  it("withdraws only the optional contribution while preserving product access", async () => {
    api.inspectGuardianManagement.mockResolvedValue({
      state: "active",
      product_status: "authorized",
      data_contribution_status: "authorized",
      data_contribution_guardian: true,
    });
    api.withdrawGuardianDataContribution.mockResolvedValue({
      state: "active",
      product_status: "authorized",
      data_contribution_status: "declined",
      data_contribution_guardian: false,
    });
    renderDecision("/guardian/decision#manage=secure-management-token");

    fireEvent.click(await screen.findByRole("button", { name: "Pilot-Auswertung beenden" }));
    fireEvent.click(screen.getByRole("button", { name: "Pilot-Auswertung beenden" }));

    await waitFor(() => expect(api.withdrawGuardianDataContribution).toHaveBeenCalledWith("secure-management-token"));
    expect(await screen.findByRole("status")).toHaveTextContent("Der normale Programmzugang bleibt aktiv");
    expect(screen.getAllByText("Nicht aktiv").length).toBeGreaterThan(0);
  });

  it("keeps guardian feedback text optional and unselected until the guardian actively enables it", async () => {
    api.inspectGuardianDecision.mockResolvedValue({
      state: "pending",
      policy_key: "de_minor_product_v2_2026_07",
      athlete_first_name: "Luka",
      feedback_text_authorization_available: true,
      feedback_text_authorization_state: "not_asked",
      feedback_text_retention_days: 365,
      feedback_text_processor_mode: "no_external_processor",
    });
    api.submitGuardianDecision.mockResolvedValue({
      state: "approved",
      feedbackTextAuthorizationState: "granted",
      receiptDelivery: "sent",
      manageUrl: "https://rewireperform.com/guardian/decision#manage=secure-management-token",
    });
    renderDecision();

    const feedbackText = await screen.findByRole("checkbox", { name: /Freiwillige Feedback-Kommentare erlauben/ });
    expect(feedbackText).not.toBeChecked();
    fireEvent.click(screen.getByRole("checkbox", { name: /Ich bestätige, dass ich.*sorgeberechtigt/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Nutzung des RewirePerform-Programms erlauben/ }));
    fireEvent.click(feedbackText);
    fireEvent.click(screen.getByRole("button", { name: "Zugang erlauben" }));

    await waitFor(() => expect(api.submitGuardianDecision).toHaveBeenCalledWith(
      "secure-decision-token",
      true,
      false,
      true,
    ));
  });

  it("lets the guardian grant and withdraw only the feedback-text scope", async () => {
    api.inspectGuardianManagement.mockResolvedValue({
      state: "active",
      product_status: "authorized",
      data_contribution_status: "declined",
      data_contribution_guardian: false,
      feedback_text_authorization_available: true,
      feedback_text_authorization_state: "not_asked",
    });
    api.setGuardianFeedbackTextAuthorization
      .mockResolvedValueOnce({
        state: "active",
        feedback_text_authorization_available: true,
        feedback_text_authorization_state: "granted",
      })
      .mockResolvedValueOnce({
        state: "active",
        feedback_text_authorization_available: true,
        feedback_text_authorization_state: "withdrawn",
      });
    renderDecision("/guardian/decision#manage=secure-management-token");

    fireEvent.click(await screen.findByRole("button", { name: "Freiwillig erlauben" }));
    fireEvent.click(screen.getByRole("button", { name: "Freiwillig erlauben" }));
    await waitFor(() => expect(api.setGuardianFeedbackTextAuthorization).toHaveBeenCalledWith(
      "secure-management-token",
      true,
    ));

    fireEvent.click(await screen.findByRole("button", { name: "Feedback-Kommentare widerrufen" }));
    fireEvent.click(screen.getByRole("button", { name: "Jetzt widerrufen" }));
    await waitFor(() => expect(api.setGuardianFeedbackTextAuthorization).toHaveBeenLastCalledWith(
      "secure-management-token",
      false,
    ));
    expect(await screen.findByRole("status")).toHaveTextContent("das Programm bleibt aktiv");
  });
});
